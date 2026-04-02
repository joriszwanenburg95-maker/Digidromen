# Authenticatie: Magic Link (Passwordless)

## Overzicht
Vervang de huidige password-based login (`signInWithPassword`) met Supabase Magic Link (`signInWithOtp`). Gebruikers ontvangen een email met een login-link — geen wachtwoord nodig.

## Waarom Magic Link?
- **Veiliger**: Geen wachtwoorden om te lekken of te vergeten
- **Gebruiksvriendelijker**: Doelgroep (maatschappelijke organisaties) hoeft geen wachtwoord te onthouden
- **Beheerbaar**: Admin maakt accounts aan, gebruiker klikt alleen op link
- **Supabase native**: Ingebouwde support, geen extra dependencies

## Supabase Configuratie

### Dashboard Settings
In Supabase Dashboard → Authentication → Settings:
- **Enable Email OTP**: Aan
- **Email template**: Pas "Magic Link" template aan met Digidromen branding
- **OTP expiry**: 1 uur (default)
- **Rate limiting**: Max 5 per uur per email
- **Redirect URL**: `https://digidromen.vercel.app` (productie) + `http://localhost:5173` (dev)

### Email Template (Supabase Dashboard → Auth → Email Templates → Magic Link)
```html
<h2>Inloggen bij Digidromen Portal</h2>
<p>Klik op de onderstaande link om in te loggen:</p>
<p><a href="{{ .ConfirmationURL }}">Inloggen</a></p>
<p>Deze link is 1 uur geldig.</p>
<p>Heb je deze email niet aangevraagd? Dan kun je deze veilig negeren.</p>
```

## Code Wijzigingen

### 1. AuthContext.tsx — Login functie vervangen

**Huidig** (`portal/src/context/AuthContext.tsx:115-131`):
```typescript
const login = async (email: string, password: string) => {
  const result = await getSupabaseClient().auth.signInWithPassword({
    email,
    password,
  });
  if (result.error) { ... }
};
```

**Nieuw**:
```typescript
const sendMagicLink = async (email: string) => {
  if (authMode === "demo") return;
  
  setLoading(true);
  setError(null);
  
  const { error } = await getSupabaseClient().auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin + '/dashboard',
    },
  });
  
  setLoading(false);
  
  if (error) {
    setError(error.message);
    throw error;
  }
};
```

### 2. AuthContextType interface aanpassen

```typescript
interface AuthContextType {
  user: AuthUser | null;
  setRole: (role: Role) => void;
  sendMagicLink: (email: string) => Promise<void>;  // was: login
  logout: () => Promise<void>;
  authMode: "demo" | "supabase";
  supabaseConfigured: boolean;
  loading: boolean;
  error: string | null;
  magicLinkSent: boolean;  // nieuw: toon "check je email" bericht
}
```

### 3. Login.tsx — UI aanpassen

Vervang password-veld met alleen email + "Stuur login link" button:

```
┌─────────────────────────────────┐
│        Digidromen Portal        │
│                                 │
│  Email:                         │
│  ┌─────────────────────────┐    │
│  │ email@organisatie.nl    │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │   Stuur login link  →   │    │
│  └─────────────────────────┘    │
│                                 │
│  --- na verzenden ---           │
│                                 │
│  ✓ Login link verstuurd naar    │
│    email@organisatie.nl         │
│    Check je inbox.              │
│                                 │
└─────────────────────────────────┘
```

### 4. Auth Callback afhandeling

Supabase magic links redirecten naar de app met een token in de URL hash. De bestaande `onAuthStateChange` listener in AuthContext (regel 92-101) vangt dit automatisch op — er is geen extra callback-route nodig.

De Supabase client is al geconfigureerd met `detectSessionInUrl: true` (in `supabase.ts`), dus tokens uit de URL worden automatisch uitgelezen.

### 5. Admin Invite Flow

Beheerders maken gebruikers aan via de bestaande `admin-users` Edge Function. Na het aanmaken:
1. Edge Function roept `supabase.auth.admin.inviteUserByEmail()` aan
2. Gebruiker ontvangt invite-email met magic link
3. Na eerste klik: account is actief, profiel is gekoppeld

De bestaande auth-profile sync trigger (`on_auth_user_created_sync_profile`) koppelt automatisch het auth account aan het user_profile.

### 6. Demo Mode behouden

De demo/localStorage fallback (`authMode === "demo"`) blijft ongewijzigd voor development zonder Supabase.

## Bestanden die wijzigen

| Bestand | Wijziging |
|---|---|
| `portal/src/context/AuthContext.tsx` | `signInWithPassword` → `signInWithOtp`, interface aanpassen |
| `portal/src/pages/Login.tsx` | Verwijder password-veld, toon "link verstuurd" status |
| `supabase/functions/admin-users/index.ts` | Voeg `inviteUserByEmail` toe aan create-actie |
| Supabase Dashboard | Email templates, redirect URLs |

## Env Variabelen
Geen nieuwe env vars nodig — magic links gebruiken dezelfde Supabase Auth configuratie.

## Vercel Redirect Config
Voeg toe aan `vercel.json` (indien nodig voor auth callback):
```json
{
  "rewrites": [
    { "source": "/auth/callback", "destination": "/index.html" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

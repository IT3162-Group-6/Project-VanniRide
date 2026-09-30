# Vanni Ride — React Frontend

Student-powered ride & delivery platform for the University of Vavuniya.
Three roles: **Customer**, **Rider**, **Admin**.

## Run

```bash
npm install
npm run dev
```

## Demo accounts (password `123456` for all)

| Role     | Email               |
|----------|---------------------|
| Customer | customer@vau.ac.lk  |
| Rider    | rider@vau.ac.lk     |
| Admin    | admin@vau.ac.lk     |

Demo data lives in `localStorage`. Admin → Profile → "Reset demo data" restores the seed.

## Folder structure

```
src/
├── components/
│   ├── Navbar.jsx           # public header + in-app topbar (variant prop)
│   ├── Sidebar.jsx          # role-based side navigation
│   ├── BottomNav.jsx        # role-based mobile tab bar
│   ├── RideCard.jsx         # one ride/delivery row
│   ├── StatusBadge.jsx      # coloured status pill
│   ├── ChatBox.jsx          # reusable conversation panel
│   ├── PaymentCard.jsx      # saved payment method row
│   ├── UserTable.jsx        # admin user table
│   ├── ProtectedRoute.jsx   # auth + role guard
│   ├── AppLayout.jsx        # sidebar + topbar shell for logged-in users
│   ├── MarketingLayout.jsx  # public pages shell
│   ├── Icon.jsx / MapArt.jsx / HeroArt.jsx / Toast.jsx / InstallPrompt.jsx
│
├── pages/
│   ├── Home.jsx  Login.jsx  Register.jsx
│   ├── customer/  CustomerDashboard · RequestRide · ActiveRide · Chat · RideHistory · Profile
│   ├── rider/     RiderDashboard · AvailableRequests · RequestDetails · ActiveRide · Chat · RideHistory · Profile
│   └── admin/     AdminDashboard · Users · Customers · Riders · Rides · RideDetails · Profile
│
├── context/
│   ├── AuthContext.jsx      # user, login, register, logout, updateUser
│   └── AppState.jsx         # toast notifications
│
├── services/
│   └── api.js               # ALL data access (auth, rides, chat, payments, admin)
│
└── App.jsx                  # routes + role guards
```

## Routes

| Path | Role |
|---|---|
| `/`, `/login`, `/register` | public |
| `/customer/dashboard · request · active · chat · history · profile` | customer |
| `/rider/dashboard · requests · requests/:id · active · chat · history · profile` | rider |
| `/admin/dashboard · users · customers · riders · rides · rides/:id · profile` | admin |

## Connecting a real backend

`src/services/api.js` is the only file that talks to data. It currently runs a
localStorage mock. To switch:

1. Set `const USE_MOCK = false;` at the top of the file.
2. Put your API base URL in `.env` as `VITE_API_URL=https://your-api/api`.

Endpoints the client expects:

```
POST   /auth/login            { email, password } -> { user, token }
POST   /auth/register         { name, email, password, role, phone }
GET    /auth/me
PATCH  /users/:id

GET    /rides?customerId=&riderId=&status=&available=
GET    /rides/:id
POST   /rides
POST   /rides/:id/accept      { riderId }
PATCH  /rides/:id/status      { status }
POST   /rides/:id/rate        { rating }

GET    /rides/:id/messages
POST   /rides/:id/messages    { senderId, text }

GET    /payments/methods?userId=
POST   /payments/topup        { userId, amount }

GET    /admin/users?role=
PATCH  /admin/users/:id/status
GET    /admin/rides
GET    /admin/stats
```

Ride statuses: `pending → accepted → ontheway → picked → completed` (plus `cancelled`).

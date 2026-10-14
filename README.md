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
│   ├── customer/
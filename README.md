Personal Finance Tracker

A full-stack personal finance tracking web application that allows users to manage income, expenses, budgets, and recurring bills with clear monthly insights and visual analytics.
This project was built to practice real-world frontend architecture, authentication, and database-driven application design using modern web tools — without relying on frontend frameworks.

🔗 Live Demo: finance-tracker-khaki-theta.vercel.app

Features:

- Authentication
- Secure email/password authentication using Supabase Auth
- User sessions persist across refreshes
- Each user can only access their own data (Row Level Security)

Transactions:

- Add, edit, and delete income and expense transactions
- Categorize transactions (e.g. Rent, Groceries, Utilities)
- Filter transactions by month using a month picker
- Automatic recalculation of totals when data changes

Dashboard

- Displays:
    - Total Income
    - Total Expenses
    - Net Balance
    - Updates dynamically based on the selected month

Budgets:

- Set monthly budgets per category
- Edit or delete existing budgets
- Visual warnings when spending exceeds the budget
- Recurring Bills
- Define recurring income or expense rules (rent, salary, subscriptions)
- Automatically generates transactions for the selected month
- Prevents duplicate recurring entries

Visual Analytics:

- Pie chart showing spending breakdown by category
- Chart updates automatically when transactions change

User Experience:

- Toast notifications for success and error feedback
- Responsive layout for smaller screens
- Dashboard access is restricted to authenticated users only

Tech Stack:

- Frontend
    - HTML5
    - CSS3 (custom styling)
    - JavaScript (ES6+)

- Backend / Database
    - Supabase (PostgreSQL)
    - Supabase Authentication
    - Row Level Security (RLS)

Libraries:
- Chart.js (data visualization)

Deployment:
- Vercel

How It Works (High Level):

- Users register or log in using email and password.
- Supabase handles authentication and session management.
- The database stores transactions, budgets, and recurring rules.

The application:

- Fetches data for the selected month
- Auto-generates recurring transactions when needed
- Calculates totals and budget warnings
- Renders tables andub charts with up-to-date data
- All database access is restricted to the authenticated user using RLS.

Why I Built This:

- I wanted to build a practical, real-world application rather than a simple CRUD demo.
- This project helped me:
    - Work with authentication and user sessions
    - Design a multi-page frontend architecture without frameworks
    - Use a real backend service instead of local storage
    - Handle recurring data and monthly views
    - Improve code organization and readability

Possible Improvements:

- CSV export for transactions
- Yearly analytics and trends
- Password recovery flow
- Mobile-first layout refinements
- Custom chart colors per category

## Screenshots:

### Authentications
![Login Page] (login.png)
![Register Page] (register.png)

### Dashboard
![Dashboard Overview[(dashboard.png)





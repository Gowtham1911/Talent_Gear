# WorkForce - Employee Management System

A full-stack Employee Management System built with Next.js, TypeScript, MySQL, and Tailwind CSS.

## Features

- JWT-based authentication with httpOnly cookies
- Role-based access control (Admin & Employee)
- Admin dashboard with full employee CRUD
- Employee self-service profile view
- Search and filter employees by department
- Secure password hashing with bcrypt

## Tech Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** MySQL
- **Auth:** JWT (jsonwebtoken + jose)

## Project Structure

```
src/
├── app/
│   ├── login/          # Login page
│   ├── register/       # Register page
│   ├── dashboard/      # Employee dashboard
│   └── admin/          # Admin panel (CRUD)
├── components/
│   ├── Sidebar.tsx     # Shared sidebar layout
│   └── EmployeeForm.tsx # Add/Edit employee form
├── lib/
│   ├── mysql.ts        # MySQL connection pool
│   └── jwt.ts          # JWT sign/verify utilities
├── models/
│   ├── User.ts         # User queries
│   └── Employee.ts     # Employee queries
├── pages/api/
│   ├── auth/           # Login, register, logout, me
│   └── employees/      # Employee CRUD API
└── middleware.ts        # Route protection by role
```

## Setup

### Prerequisites
- Node.js
- MySQL

### Database Setup

```sql
CREATE DATABASE employee_mgmt;
USE employee_mgmt;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin','employee') NOT NULL DEFAULT 'employee'
);

CREATE TABLE employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  department VARCHAR(100),
  position VARCHAR(100),
  salary DECIMAL(10,2),
  hire_date DATE,
  status ENUM('active','inactive') DEFAULT 'active',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Environment Variables

Create a `.env.local` file:

```plaintext
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=employee_mgmt
JWT_SECRET=your_jwt_secret
```

### Run Locally

```sh
npm install
npm run dev
```

## Usage

1. Register at `/register`
2. Promote a user to admin via SQL: `UPDATE users SET role='admin' WHERE email='your@email.com';`
3. Login at `/login` — admins go to `/admin`, employees go to `/dashboard`

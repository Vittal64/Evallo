# Evallo – Tutoring Business Automation Assignment  
**Human Resource Management System (HRMS)**

A complete full-stack HRMS built exactly to the assignment specification using:

- **Backend**: Node.js + Express + MySQL (raw queries – no Sequelize/TypeORM/Knex)  
- **Frontend**: React with create-react-app (no Vite)  
- **Authentication**: JWT + bcrypt  
- **Features**: Organisation isolation, full CRUD for employees & teams, many-to-many employee ↔ team relationship, complete audit logging (login/logout + all CRUD + assignments)

## Features Implemented (100% as required)

| Requirement                                   | Implemented |
|-----------------------------------------------|-------------|
| Organisation account + first admin creation   | Yes         |
| Login / Logout with JWT                       | Yes         |
| Full CRUD for Employees                       | Yes         |
| Full CRUD for Teams                           | Yes         |
| Many-to-many employee ↔ team assignment      | Yes (assign / unassign single or batch) |
| All actions logged (audit trail)              | Yes (logs table + UI) |
| Organisation-level data isolation             | Yes (`organisation_id` on every relevant table) |
| Protected routes (auth middleware)           | Yes         |
| Clean, minimal React UI with modals           | Yes         |
| LocalStorage for JWT (allowed for assignment) | Yes         |

## Project Structure

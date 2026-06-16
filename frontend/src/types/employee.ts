export interface IEmployee {
  id: number;
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  department: string;
  position: string;
  salary: number;
  hire_date: string;
  status: "active" | "inactive";
}

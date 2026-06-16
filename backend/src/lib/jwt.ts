import jwt from "jsonwebtoken";

export interface JwtPayload {
  id: number;
  email: string;
  role: "admin" | "employee" | "student";
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "8h" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
}

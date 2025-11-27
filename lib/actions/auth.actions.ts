"use server";

import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { signIn as nextAuthSignIn, signOut as nextAuthSignOut, auth } from "@/lib/auth.config";
import { parseStringify } from "../utils";

// Sign Up (Create User)
export const signUp = async (params: {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role?: string;
}) => {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: params.email },
    });

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(params.password, 10);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        name: params.name,
        email: params.email,
        phone: params.phone,
        password: hashedPassword,
        role: params.role || "patient",
      },
    });

    return parseStringify(newUser);
  } catch (error: any) {
    console.error("An error occurred while creating a new user:", error);
    throw error;
  }
};

// Sign In
export const signIn = async (email: string, password: string) => {
  try {
    const result = await nextAuthSignIn("credentials", {
      email,
      password,
      redirect: false,
    });

    return result;
  } catch (error: any) {
    console.error("An error occurred while signing in:", error);
    throw error;
  }
};

// Sign Out
export const signOut = async () => {
  try {
    await nextAuthSignOut();
  } catch (error: any) {
    console.error("An error occurred while signing out:", error);
    throw error;
  }
};

// Get Session
export const getSession = async () => {
  try {
    const session = await auth();
    return session;
  } catch (error: any) {
    console.error("An error occurred while getting session:", error);
    return null;
  }
};

// Get User by ID
export const getUserById = async (userId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        image: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return parseStringify(user);
  } catch (error: any) {
    console.error("An error occurred while retrieving user:", error);
    throw error;
  }
};

// Get User by Email
export const getUserByEmail = async (email: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        image: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return parseStringify(user);
  } catch (error: any) {
    console.error("An error occurred while retrieving user:", error);
    throw error;
  }
};

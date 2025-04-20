import { NextResponse } from 'next/server';
import { createAdminUser, getUserProfile } from '@/lib/firebase/firebaseUtils';

// This is a one-time setup route to create the initial admin user
// In a production app, you would want to secure this endpoint further
export async function POST(request: Request) {
  try {
    const { email, password, displayName, secretKey } = await request.json();
    
    // Validate the secret key (this should be a strong, environment-specific secret)
    // In production, use a strong secret from environment variables
    const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'admin-setup-secret-key';
    
    if (secretKey !== ADMIN_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid secret key' },
        { status: 401 }
      );
    }
    
    // Validate required fields
    if (!email || !password || !displayName) {
      return NextResponse.json(
        { error: 'Bad Request: Missing required fields' },
        { status: 400 }
      );
    }
    
    // Create the admin user
    const user = await createAdminUser(email, password, displayName);
    
    // Return success response
    return NextResponse.json(
      { 
        success: true,
        message: 'Admin user created successfully',
        userId: user.uid 
      },
      { status: 201 }
    );
    
  } catch (error: any) {
    console.error('Error creating admin user:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: error.message || 'Failed to create admin user' 
      },
      { status: 500 }
    );
  }
} 
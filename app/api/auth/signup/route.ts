import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
    try {
        const { email, password, name } = await request.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        // Use Auth0's Database API to signup
        const signupResponse = await fetch(
            `https://${process.env.AUTH0_DOMAIN}/dbconnections/signup`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: process.env.AUTH0_CLIENT_ID,
                    email,
                    password,
                    connection: 'Username-Password-Authentication',
                    name: name || email.split('@')[0],
                }),
            }
        );

        const signupData = await signupResponse.json();

        let isNewUser = true;

        if (!signupResponse.ok) {
            console.error('Signup error:', signupData);

            if (signupData.code === 'invalid_signup') {
                const descString = typeof signupData.description === 'string' ? signupData.description : JSON.stringify(signupData.description || '');

                if (descString.toLowerCase().includes('already exists') || descString.toLowerCase() === 'invalid sign up') {
                    // User exists, try to log them in
                    isNewUser = false;
                } else {
                    // Real validation error
                    let errorMessage = 'Invalid signup details';
                    if (typeof signupData.description === 'string') {
                        errorMessage = signupData.description;
                    } else if (signupData.description && typeof signupData.description === 'object') {
                        try {
                            // @ts-ignore
                            if (signupData.description.rules) {
                                // @ts-ignore
                                const rules = signupData.description.rules.map(r => r.message).join('. ');
                                errorMessage = `Password requirements not met: ${rules}`;
                            } else {
                                errorMessage = JSON.stringify(signupData.description);
                            }
                        } catch (e) {
                            errorMessage = 'Password requirements not met.';
                        }
                    } else if (signupData.message) {
                        errorMessage = signupData.message;
                    }
                    return NextResponse.json({ error: errorMessage }, { status: 400 });
                }
            } else if (signupData.code === 'user_exists') {
                // User exists, try to log them in
                isNewUser = false;
            } else {
                // Other generic errors
                let errorMessage = 'Failed to create account';
                if (typeof signupData.description === 'string') {
                    errorMessage = signupData.description;
                } else if (typeof signupData.message === 'string') {
                    errorMessage = signupData.message;
                }
                return NextResponse.json({ error: errorMessage }, { status: 400 });
            }
        }

        // Now log the user in using ROPG
        const tokenResponse = await fetch(
            `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    grant_type: 'http://auth0.com/oauth/grant-type/password-realm',
                    username: email,
                    password: password,
                    client_id: process.env.AUTH0_CLIENT_ID,
                    client_secret: process.env.AUTH0_CLIENT_SECRET,
                    realm: 'Username-Password-Authentication',
                    scope: 'openid profile email',
                }),
            }
        );

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
            if (isNewUser) {
                // User created but couldn't log in - still success
                return NextResponse.json({
                    success: true,
                    message: 'Account created. Please log in.',
                    requiresLogin: true,
                });
            } else {
                // Existing user key failed to login (wrong password)
                // Return original "Account exists" error to not reveal password validity, 
                // or just say account exists.
                return NextResponse.json(
                    { error: 'This account already exists' },
                    { status: 409 }
                );
            }
        }

        // Get user info
        const userInfoResponse = await fetch(
            `https://${process.env.AUTH0_DOMAIN}/userinfo`,
            {
                headers: {
                    Authorization: `Bearer ${tokenData.access_token}`,
                },
            }
        );

        const userInfo = await userInfoResponse.json();

        // Store tokens in HTTP-only cookie
        const cookieStore = await cookies();

        const sessionData = {
            accessToken: tokenData.access_token,
            idToken: tokenData.id_token,
            expiresAt: Date.now() + (tokenData.expires_in * 1000),
            user: {
                sub: userInfo.sub,
                email: userInfo.email,
                name: userInfo.name || name || email.split('@')[0],
                picture: userInfo.picture,
            },
        };

        cookieStore.set('terrawatt_auth', JSON.stringify(sessionData), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: tokenData.expires_in,
            path: '/',
        });

        return NextResponse.json({
            success: true,
            user: sessionData.user,
        });
    } catch (error) {
        console.error('Signup error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}

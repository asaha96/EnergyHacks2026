import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        // Call Auth0's Resource Owner Password Grant endpoint
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
            console.error('Auth0 error:', tokenData);
            return NextResponse.json(
                { error: tokenData.error_description || 'Invalid credentials' },
                { status: 401 }
            );
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

        // Store tokens in HTTP-only cookie for security
        const cookieStore = await cookies();

        const sessionData = {
            accessToken: tokenData.access_token,
            idToken: tokenData.id_token,
            expiresAt: Date.now() + (tokenData.expires_in * 1000),
            user: {
                sub: userInfo.sub,
                email: userInfo.email,
                name: userInfo.name || userInfo.nickname || userInfo.email?.split('@')[0],
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
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}

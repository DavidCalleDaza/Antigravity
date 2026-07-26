import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';

/**
 * SocialCallback — OAuth callback handler.
 *
 * With the V10 backend changes, the OAuth callback now redirects
 * directly from the backend to /products?social_status=success|error.
 * This component is kept as a fallback for any edge cases where
 * the browser lands on /social/callback/:platform directly.
 */
const SocialCallback = () => {
    const { platform } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('loading');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const socialStatus = searchParams.get('social_status');
        const detail = searchParams.get('detail');

        if (socialStatus === 'success') {
            setStatus('success');
            setTimeout(() => navigate('/products'), 2000);
            return;
        }

        if (socialStatus === 'error') {
            setStatus('error');
            setErrorMsg(detail || 'Unknown error occurred during authorization.');
            return;
        }

        // If we land here without social_status params, it means
        // something unexpected happened. Redirect to products.
        setStatus('error');
        setErrorMsg('Unexpected callback state. Please try connecting again.');
        setTimeout(() => navigate('/products'), 3000);
    }, [platform, searchParams, navigate]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            padding: '20px',
            textAlign: 'center',
            background: 'var(--neutral-950, #0a0a0a)',
            color: 'var(--text-primary, #fff)',
        }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                Conectando cuenta de {platform}...
            </h2>
            {status === 'loading' && <p>Procesando autorización, por favor espera.</p>}
            {status === 'success' && (
                <p style={{ color: 'var(--success, #22c55e)' }}>
                    ¡Cuenta conectada exitosamente! Redirigiendo...
                </p>
            )}
            {status === 'error' && (
                <div>
                    <p style={{ color: 'var(--error, #ef4444)', marginBottom: '1rem' }}>
                        Error conectando la cuenta: {errorMsg}
                    </p>
                    <button
                        onClick={() => navigate('/products')}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: 'var(--gold, #d4a843)',
                            color: 'var(--neutral-950, #0a0a0a)',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                        }}
                    >
                        Volver a productos
                    </button>
                </div>
            )}
        </div>
    );
};

export default SocialCallback;

import React, { useState, useEffect } from 'react';
import { Facebook, Instagram, Share2, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { socialClient } from '../../utils/apiClient';

const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: '#E4405F' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: '#1877F2' },
  { id: 'tiktok', name: 'TikTok', icon: Share2, color: '#000000' },
];

export default function SocialSettings() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const data = await socialClient.listAccounts();
      setAccounts(data);
    } catch (error) {
      console.error('Error fetching social accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = (platform) => {
    // In a real app, this would redirect to OAuth
    toast.info(`Iniciando conexión con ${platform}...`, 'Próximamente');
    // window.location.href = `${API_BASE_URL}/social/auth/${platform}`;
  };

  const handleDisconnect = async (platform) => {
    try {
      await socialClient.deleteAccount(platform);
      setAccounts(accounts.filter(a => a.platform !== platform));
      toast.success(`${platform} desconectado correctamente.`, 'Éxito');
    } catch (error) {
      toast.error('No se pudo desconectar la cuenta.', 'Error');
    }
  };

  const isConnectedToAny = accounts.length > 0;

  return (
    <div className="social-settings">
      <div className="section-header">
        <Share2 width="20" height="20" />
        <h3>Gestión de Redes Sociales</h3>
      </div>
      
      <p className="text-sm text-tertiary mb-8">
        Vincula tus cuentas para publicar contenido directamente desde Servinow. 
        Recomendamos cuentas tipo <strong>Business</strong> para Instagram.
      </p>

      <div className="social-platforms-grid">
        {PLATFORMS.map((platform) => {
          const isConnected = accounts.find(a => a.platform === platform.id);
          const Icon = platform.icon;

          return (
            <div key={platform.id} className={`social-platform-card ${isConnected ? 'connected' : ''}`}>
              <div className="platform-icon-wrapper" style={{ backgroundColor: platform.color + '15', color: platform.color }}>
                <Icon width="24" height="24" />
              </div>
              
              <div className="platform-info">
                <h4>{platform.name}</h4>
                <div className="platform-status">
                  {isConnected ? (
                    <span className="status-badge connected">
                      <CheckCircle2 width="12" height="12" />
                      Conectado
                    </span>
                  ) : (
                    <span className="status-badge disconnected">
                      <AlertCircle width="12" height="12" />
                      No vinculado
                    </span>
                  )}
                </div>
              </div>

              <div className="platform-action">
                {isConnected ? (
                  <button 
                    className="btn btn-ghost btn-sm text-danger" 
                    onClick={() => handleDisconnect(platform.id)}
                    title="Desvincular cuenta"
                  >
                    <Trash2 width="18" height="18" />
                  </button>
                ) : (
                  <button 
                    className="btn btn-outline btn-sm"
                    onClick={() => handleConnect(platform.id)}
                  >
                    <Plus width="16" height="16" />
                    Conectar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isConnectedToAny && (
        <div className="social-info-banner mt-8 p-4 rounded-xl border border-primary-subtle bg-primary-subtle/10 flex gap-3">
          <AlertCircle className="text-primary shrink-0" width="20" height="20" />
          <p className="text-xs text-secondary">
            <strong>Nota:</strong> Los tokens de Meta (Facebook/Instagram) caducan cada 60 días. 
            Servinow intentará renovarlos automáticamente, pero es posible que debas volver a autorizar la cuenta periódicamente.
          </p>
        </div>
      )}
    </div>
  );
}

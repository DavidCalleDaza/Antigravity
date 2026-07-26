import React, { useState, useEffect, useCallback } from 'react';
import { MessageCircle, CheckCircle2, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { whatsappClient } from '../../utils/apiClient';
import { APP_CONFIG } from '../../config/appConfig';
import Modal from '../../components/ui/Modal';

export default function WhatsAppSettings() {
  const [linked, setLinked] = useState(false);
  const [phoneMasked, setPhoneMasked] = useState('');
  const [loading, setLoading] = useState(true);
  const [otp, setOtp] = useState('');
  const [expiresAt, setExpiresAt] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isUnlinkModalOpen, setIsUnlinkModalOpen] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const toast = useToast();

  const fetchStatus = useCallback(async () => {
    try {
      const data = await whatsappClient.getLinkStatus();
      setLinked(data.linked);
      setPhoneMasked(data.phone_masked || '');
    } catch (error) {
      console.error('Error fetching WhatsApp status:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining === 0) {
        setOtp('');
        setExpiresAt(null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleGenerateOtp = async () => {
    setGenerating(true);
    try {
      const data = await whatsappClient.generateOtp();
      setOtp(data.otp);
      setExpiresAt(Date.now() + data.expires_in_seconds * 1000);
      toast.success('Código generado. Envíalo por WhatsApp para vincular tu número.', 'Éxito');
    } catch (error) {
      toast.error(error.message || 'No se pudo generar el código.', 'Error');
    } finally {
      setGenerating(false);
    }
  };

  const handleUnlink = async () => {
    setUnlinking(true);
    try {
      await whatsappClient.unlink();
      setLinked(false);
      setPhoneMasked('');
      setIsUnlinkModalOpen(false);
      toast.success('Número desvinculado correctamente.', 'Éxito');
    } catch (error) {
      toast.error(error.message || 'No se pudo desvincular el número.', 'Error');
    } finally {
      setUnlinking(false);
    }
  };

  if (loading) {
    return (
      <div className="social-settings">
        <div className="section-header">
          <MessageCircle width="20" height="20" />
          <h3>WhatsApp Business</h3>
        </div>
        <div className="flex items-center gap-2 text-secondary">
          <Loader2 className="spin" width={16} />
          <span className="text-sm">Cargando estado...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="social-settings">
      <div className="section-header">
        <MessageCircle width="20" height="20" />
        <h3>WhatsApp Business</h3>
      </div>

      <div className="social-info-banner mb-8 p-4 rounded-xl border border-primary-subtle bg-primary-subtle/10 flex gap-3">
        <AlertCircle className="text-primary shrink-0" width="20" height="20" />
        <p className="text-sm text-secondary">
          Vincula tu número de WhatsApp para crear productos y servicios enviando mensajes directamente desde tu celular.
          Envía un mensaje con el nombre y precio de tu producto y ServiNow lo creará por ti.
        </p>
      </div>

      <div className="social-platforms-grid">
        <div className="social-platform-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'stretch' }}>
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-3">
              <div className="platform-icon-wrapper" style={{ backgroundColor: '#25D36615', color: '#25D366', borderRadius: '50%', padding: '8px' }}>
                <MessageCircle width="24" height="24" />
              </div>
              <div>
                <h4 style={{ margin: 0 }}>WhatsApp</h4>
              </div>
            </div>
            <div>
              {linked ? (
                <button className="btn btn-ghost btn-sm text-danger" onClick={() => setIsUnlinkModalOpen(true)}>
                  <Trash2 width="18" height="18" /> Desvincular
                </button>
              ) : (
                <button className="btn btn-outline btn-sm" onClick={handleGenerateOtp} disabled={generating}>
                  {generating ? <Loader2 className="spin" width={16} /> : <><MessageCircle width="16" height="16" style={{ marginRight: '4px' }} /> Vincular WhatsApp</>}
                </button>
              )}
            </div>
          </div>

          {linked && (
            <div className="text-sm text-secondary border-t border-neutral-700 pt-3 mt-1">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center w-full">
                  <span><CheckCircle2 width={14} className="inline text-success mr-1" /> Vinculado: {phoneMasked}</span>
                </div>
                <div className="text-xs opacity-70 mt-1">
                  Crea productos y servicios enviando mensajes por WhatsApp.
                </div>
              </div>
            </div>
          )}

          {!linked && otp && (
            <div className="bg-neutral-800 p-4 rounded-lg mt-2">
              <div className="flex flex-col gap-3">
                <div className="text-center">
                  <p className="text-sm text-secondary mb-2">Tu código de vinculación es:</p>
                  <p className="text-3xl font-mono font-bold tracking-widest" style={{ color: '#25D366' }}>{otp}</p>
                  <p className="text-xs text-tertiary mt-2">
                    Expira en {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
                  </p>
                </div>
                <div className="bg-neutral-700 p-3 rounded-lg text-center">
                  <p className="text-sm text-secondary">
                    Envía este código por WhatsApp al <strong>{APP_CONFIG.WHATSAPP.TEST_PHONE}</strong>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isUnlinkModalOpen}
        onClose={() => setIsUnlinkModalOpen(false)}
        title="¿Desvincular WhatsApp?"
        size="sm"
        actions={[
          { label: 'Cancelar', onClick: () => setIsUnlinkModalOpen(false) },
          { label: 'Sí, desvincular', className: 'btn-danger', onClick: handleUnlink },
        ]}
      >
        <div className="text-center py-4">
          <AlertCircle width="48" height="48" className="text-danger mx-auto mb-4" />
          <p className="text-secondary">
            Se eliminará la vinculación con tu número de WhatsApp. Para volver a crear productos por chat, deberás vincularlo de nuevo.
          </p>
        </div>
      </Modal>
    </div>
  );
}

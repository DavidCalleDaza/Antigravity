import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Share2, Facebook, Instagram, Plus, ExternalLink, AlertCircle } from 'lucide-react';
import AccordionSection from '../../../components/ui/AccordionSection';
import ShareOnSaveSection from '../../../components/ui/ShareOnSaveSection';

export default function WallSocialSection({ accounts, shareOnSave, setShareOnSave }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const metaAccounts = accounts.filter((a) => a.platform === 'facebook' || a.platform === 'instagram');
  const tikTokAccounts = accounts.filter((a) => a.platform === 'tiktok');
  const hasAccounts = accounts.length > 0;
  const selectedCount = shareOnSave.length;
  const socialSummary = !hasAccounts
    ? 'Desconectado'
    : selectedCount > 0
    ? `${selectedCount} seleccionada${selectedCount > 1 ? 's' : ''}`
    : `${accounts.length} cuenta${accounts.length > 1 ? 's' : ''} conectada${accounts.length > 1 ? 's' : ''}`;

  return (
    <AccordionSection
      icon={<Share2 width={16} height={16} />}
      title="REDES SOCIALES"
      isOpen={isOpen}
      onToggle={() => setIsOpen(!isOpen)}
      summary={socialSummary}
    >
      {metaAccounts.length === 0 ? (
        <div className="social-connect-card">
          <div className="social-connect-card-header">
            <Facebook width={20} height={20} />
            <Instagram width={20} height={20} />
            <span>Meta (Facebook &amp; Instagram)</span>
          </div>
          <div className="social-connect-status">
            <AlertCircle width={14} height={14} className="text-secondary" />
            <span>Estado: Desconectado</span>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm mt-1"
            onClick={() => navigate('/profile')}
          >
            <Plus width={14} height={14} /> Conectar Cuenta de Meta <ExternalLink width={12} height={12} className="ml-1" />
          </button>
        </div>
      ) : null}

      {tikTokAccounts.length === 0 ? (
        <div className="social-connect-card">
          <div className="social-connect-card-header">
            <Share2 width={20} height={20} />
            <span>TikTok</span>
          </div>
          <div className="social-connect-status">
            <AlertCircle width={14} height={14} className="text-secondary" />
            <span>Estado: Desconectado</span>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm mt-1"
            onClick={() => navigate('/profile')}
          >
            <Plus width={14} height={14} /> Conectar Cuenta de TikTok <ExternalLink width={12} height={12} className="ml-1" />
          </button>
        </div>
      ) : null}

      {hasAccounts && (
        <ShareOnSaveSection
          accounts={accounts}
          selectedNetworks={shareOnSave}
          onChange={setShareOnSave}
        />
      )}
    </AccordionSection>
  );
}

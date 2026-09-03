import React from 'react';
import { Share2, ExternalLink, ChevronRight, ArrowUpRight } from 'lucide-react';
import { FacebookBrandIcon, InstagramBrandIcon, TikTokBrandIcon } from './SocialBrandIcons';
import { useNavigate } from 'react-router-dom';

const BRAND_ICONS = {
  facebook: FacebookBrandIcon,
  instagram: InstagramBrandIcon,
  tiktok: TikTokBrandIcon,
};

const BRAND_NAMES = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
};

const BRAND_THEMES = {
  facebook: {
    badgeBg: 'rgba(24, 119, 242, 0.12)',
    badgeColor: '#1877F2',
  },
  instagram: {
    badgeBg: 'rgba(225, 48, 108, 0.12)',
    badgeColor: '#E1306C',
  },
  tiktok: {
    badgeBg: 'rgba(37, 244, 238, 0.12)',
    badgeColor: '#25F4EE',
  },
};

export default function ShareOnSaveSection({ accounts = [] }) {
  const navigate = useNavigate();
  const hasAccounts = accounts.length > 0;

  const handleGoToProfileSocial = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    navigate('/profile?tab=social');
  };

  return (
    <div className="share-on-save">
      <div className="share-on-save-header">
        <div className="share-on-save-title-wrap">
          <Share2 width={13} height={13} className="text-primary flex-shrink-0" />
          <span className="share-on-save-title">Redes Conectadas</span>
        </div>
        {hasAccounts && (
          <span className="share-on-save-count-pill">
            {accounts.length} activa{accounts.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="share-on-save-cards-list">
        {!hasAccounts ? (
          <div className="share-on-save-empty-state">
            <span>No hay cuentas conectadas y activas.</span>
            <button
              type="button"
              className="share-on-save-connect-btn"
              onClick={handleGoToProfileSocial}
            >
              <span>Vincular en Mi Perfil</span>
              <ArrowUpRight width={12} height={12} />
            </button>
          </div>
        ) : (
          <>
            {accounts.map((account) => {
              const Icon = BRAND_ICONS[account.platform] || Share2;
              const brandTheme = BRAND_THEMES[account.platform] || {
                badgeBg: 'rgba(62, 180, 137, 0.12)',
                badgeColor: 'var(--primary)',
              };
              const platformName = BRAND_NAMES[account.platform] || account.platform;
              const rawName =
                account.display_label ||
                account.platform_username ||
                account.platform_user_id ||
                'Cuenta conectada';

              return (
                <div
                  key={account.id}
                  className="share-on-save-account-card"
                  onClick={handleGoToProfileSocial}
                  title="Clic para gestionar en Mi Perfil -> Redes sociales"
                  role="button"
                  tabIndex={0}
                >
                  <div className="share-on-save-brand-icon-wrap" style={{ background: brandTheme.badgeBg }}>
                    <Icon size={18} />
                  </div>

                  <div className="share-on-save-account-info">
                    <span className="share-on-save-account-name" title={rawName}>
                      {rawName}
                    </span>
                    <div className="share-on-save-account-sub">
                      <span className="share-on-save-platform-badge" style={{ color: brandTheme.badgeColor }}>
                        {platformName}
                      </span>
                      {account.account_type && (
                        <span className="share-on-save-type-badge">
                          {account.account_type === 'business' ? 'Business' : account.account_type}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="share-on-save-card-action">
                    <span className="status-dot-active" title="Conectada y activa" />
                    <ChevronRight width={13} height={13} className="share-on-save-chevron" />
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              className="share-on-save-profile-btn"
              onClick={handleGoToProfileSocial}
            >
              <ExternalLink width={13} height={13} />
              <span>Gestionar en Mi Perfil &rarr; Redes sociales</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

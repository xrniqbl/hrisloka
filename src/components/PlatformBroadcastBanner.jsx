/**
 * Founder → Owner broadcast banner (top of HR shell).
 * Shows latest non-dismissed platform broadcast; also listens realtime.
 */
import { useState, useEffect, useCallback } from 'react';
import { Icon } from '@astryxdesign/core/Icon';
import { Megaphone, X, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  getPlatformBroadcasts,
  getDismissedBroadcastIds,
  dismissBroadcastLocally,
} from '../services/ownerPlatformService';
import './PlatformBroadcastBanner.css';

export default function PlatformBroadcastBanner() {
  const { employee, subscription } = useAuth();
  const [broadcast, setBroadcast] = useState(null);

  const companyId = employee?.company_id;
  const planId =
    subscription?.plan_id ||
    subscription?.subscription_plans?.id ||
    null;

  const pickLatest = useCallback((list) => {
    const dismissed = new Set(getDismissedBroadcastIds());
    return (list || []).find((b) => !dismissed.has(b.id)) || null;
  }, []);

  const load = useCallback(async () => {
    // Super admin / HR admin only — employees use internal notifs
    const role = employee?.role;
    if (!role || !['super_admin', 'hr_admin'].includes(role)) {
      setBroadcast(null);
      return;
    }
    const { data } = await getPlatformBroadcasts({
      companyId,
      planId,
      limit: 15,
    });
    setBroadcast(pickLatest(data));
  }, [companyId, planId, employee?.role, pickLatest]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime channel from founder sendBroadcast
  useEffect(() => {
    const role = employee?.role;
    if (!role || !['super_admin', 'hr_admin'].includes(role)) return undefined;

    const channel = supabase
      .channel('owner-founder-broadcast')
      .on('broadcast', { event: 'new_broadcast' }, ({ payload }) => {
        if (!payload?.id) return;
        const dismissed = new Set(getDismissedBroadcastIds());
        if (dismissed.has(payload.id)) return;

        const target = payload.target || 'all';
        if (target === 'company' && String(payload.target_company_id) !== String(companyId)) {
          return;
        }
        if (target === 'plan' && planId != null && String(payload.target_plan_id) !== String(planId)) {
          return;
        }
        setBroadcast(payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employee?.role, companyId, planId]);

  if (!broadcast) return null;

  const handleDismiss = () => {
    dismissBroadcastLocally(broadcast.id);
    setBroadcast(null);
  };

  const type = broadcast.type || 'info';

  return (
    <div className={`pbb-banner pbb-banner--${type}`} role="status">
      <span className="pbb-icon" aria-hidden>
        <Icon icon={Megaphone} size="sm" color="inherit" />
      </span>
      <div className="pbb-body">
        <strong className="pbb-title">{broadcast.title}</strong>
        <span className="pbb-msg">{broadcast.message}</span>
        {broadcast.action_url && (
          <a
            className="pbb-link"
            href={broadcast.action_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {broadcast.action_label || 'Selengkapnya'}
            <Icon icon={ExternalLink} size="sm" color="inherit" />
          </a>
        )}
      </div>
      <button type="button" className="pbb-close" onClick={handleDismiss} aria-label="Tutup">
        <Icon icon={X} size="sm" color="inherit" />
      </button>
    </div>
  );
}

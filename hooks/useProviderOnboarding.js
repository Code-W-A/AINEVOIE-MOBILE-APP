import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { toUiProviderVerificationStatus } from '@ainevoie/firebase-shared';
import { useSession } from '../context/sessionContext';
import { fetchProviderProfile, mapProviderDocToHookData, saveProviderProfilePatch } from '../src/firebase/profileStore';
import { normalizeRateValue } from '../src/features/shared/utils/mockFormatting';
import { buildCoverageAreaPatch, normalizeCoverageAreaForm } from '../src/features/shared/utils/providerCoverage';

const defaultProviderOnboarding = {
  account: {
    name: '',
    email: '',
    password: '',
  },
  professionalProfile: {
    businessName: '',
    displayName: '',
    specialization: '',
    baseRate: '',
    coverageArea: '',
    coverageAreaConfig: normalizeCoverageAreaForm(null),
    shortBio: '',
    availabilitySummary: '',
  },
  documents: {
    identity: null,
    professional: null,
  },
  currentStep: 0,
  verificationStatus: 'draft',
  completedAt: null,
  updatedAt: null,
};

function normalizeProviderOnboarding(payload) {
  const normalizedBaseRate = normalizeRateValue(payload?.professionalProfile?.baseRate || '');
  const coverageAreaConfig = normalizeCoverageAreaForm(
    payload?.professionalProfile?.coverageAreaConfig,
  );
  const coverageAreaPatch = buildCoverageAreaPatch(coverageAreaConfig);

  return {
    ...defaultProviderOnboarding,
    ...(payload || {}),
    account: {
      ...defaultProviderOnboarding.account,
      ...(payload?.account || {}),
    },
    professionalProfile: {
      ...defaultProviderOnboarding.professionalProfile,
      ...(payload?.professionalProfile || {}),
      baseRate: normalizedBaseRate || '',
      coverageAreaConfig,
      coverageArea: payload?.professionalProfile?.coverageArea || coverageAreaPatch.coverageAreaText,
    },
    documents: {
      ...defaultProviderOnboarding.documents,
      ...(payload?.documents || {}),
    },
  };
}

export function useProviderOnboarding() {
  const { session } = useSession();
  const [data, setData] = useState(defaultProviderOnboarding);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const latestDataRef = useRef(defaultProviderOnboarding);
  const saveRequestIdRef = useRef(0);

  const canUseRemote = Boolean(
    session.isAuthenticated
    && session.activeRole === 'provider'
    && session.uid
    && !session.configError,
  );

  const applyData = useCallback((nextValue) => {
    latestDataRef.current = nextValue;
    setData(nextValue);
    return nextValue;
  }, []);

  const loadProviderOnboarding = useCallback(async () => {
    if (!canUseRemote) {
      setIsLoading(false);
      return normalizeProviderOnboarding(latestDataRef.current);
    }

    setIsLoading(true);
    setError(null);

    try {
      const remoteProfile = await fetchProviderProfile(session.uid);
      const nextValue = remoteProfile
        ? normalizeProviderOnboarding({
            ...defaultProviderOnboarding,
            ...mapProviderDocToHookData(remoteProfile, defaultProviderOnboarding),
            verificationStatus: toUiProviderVerificationStatus(remoteProfile.status),
          })
        : defaultProviderOnboarding;
      applyData(nextValue);
      setIsLoading(false);
      return nextValue;
    } catch (nextError) {
      setError(nextError);
      applyData(defaultProviderOnboarding);
      setIsLoading(false);
      return defaultProviderOnboarding;
    }
  }, [applyData, canUseRemote, session.uid]);

  useFocusEffect(
    useCallback(() => {
      void loadProviderOnboarding();
    }, [loadProviderOnboarding])
  );

  const saveProviderOnboarding = useCallback(async (updater) => {
    const requestId = saveRequestIdRef.current + 1;
    saveRequestIdRef.current = requestId;
    const baseValue = normalizeProviderOnboarding(latestDataRef.current);
    const nextValue = typeof updater === 'function' ? updater(baseValue) : normalizeProviderOnboarding(updater);
    const normalized = normalizeProviderOnboarding({
      ...nextValue,
      updatedAt: new Date().toISOString(),
    });

    applyData(normalized);

    if (!canUseRemote) {
      return normalized;
    }

    try {
      const remoteProfile = await saveProviderProfilePatch(session.uid, {
        professionalProfile: {
          businessName: normalized.professionalProfile.businessName || '',
          displayName: normalized.professionalProfile.displayName || normalized.account.name || '',
          specialization: normalized.professionalProfile.specialization || '',
          baseRateAmount: normalized.professionalProfile.baseRate ? Number(normalized.professionalProfile.baseRate) : null,
          ...buildCoverageAreaPatch(normalized.professionalProfile.coverageAreaConfig),
          shortBio: normalized.professionalProfile.shortBio || '',
        },
      });

      if (remoteProfile && requestId === saveRequestIdRef.current) {
        const nextRemoteValue = normalizeProviderOnboarding({
          ...latestDataRef.current,
          ...mapProviderDocToHookData(remoteProfile, latestDataRef.current),
          verificationStatus: toUiProviderVerificationStatus(remoteProfile.status),
        });
        applyData(nextRemoteValue);
        return nextRemoteValue;
      }
    } catch (nextError) {
      setError(nextError);
    }

    if (requestId === saveRequestIdRef.current) {
      applyData(normalized);
    }
    return normalized;
  }, [applyData, canUseRemote, session.uid]);

  const clearProviderOnboarding = useCallback(() => {
    applyData(defaultProviderOnboarding);
    return defaultProviderOnboarding;
  }, [applyData]);

  const onboardingProgress = useMemo(() => {
    const hasAccount = Boolean(data.account.name && data.account.email);
    const hasProfessional = Boolean(
      data.professionalProfile.businessName &&
      data.professionalProfile.displayName &&
      data.professionalProfile.specialization &&
      data.professionalProfile.baseRate &&
      data.professionalProfile.coverageArea &&
      data.professionalProfile.shortBio &&
      data.professionalProfile.availabilitySummary
    );
    const hasDocuments = Boolean(data.documents.identity?.uri && data.documents.professional?.uri);

    return {
      hasAccount,
      hasProfessional,
      hasDocuments,
      isSubmitted: data.verificationStatus === 'pending',
      canResume: hasAccount || hasProfessional || hasDocuments || data.currentStep > 0,
    };
  }, [data]);

  return {
    data,
    isLoading,
    error,
    onboardingProgress,
    loadProviderOnboarding,
    reload: loadProviderOnboarding,
    saveProviderOnboarding,
    clearProviderOnboarding,
  };
}

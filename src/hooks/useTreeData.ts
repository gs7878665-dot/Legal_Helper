import { useState, useEffect, useCallback } from 'react';
import type { CategoryItem } from '../api/types';
import { apiClient } from '../api/client';

export const INITIAL_CATEGORIES: CategoryItem[] = [
  {
    id: 'eb2fc65c-ed4d-42c7-8054-fef23857e28c',
    slug: 'ai-assistance',
    name: 'AI Assistance',
    description: 'AI-powered legal intelligence, contextual case guidance, and automated legal research',
    sort_order: 1,
    branch_position: {
      level: 1,
      height: 3.2,
      angle: 0.0,
      radius: 4.8,
      color: '#c084fc',
      glow: 'rgba(192, 132, 252, 0.4)',
    },
    tools: [
      {
        id: '1',
        category_id: 'eb2fc65c-ed4d-42c7-8054-fef23857e28c',
        slug: 'legal-advisor',
        name: 'Legal Advisor',
        description: 'Personal AI legal assistant providing plain-language statutory guidance',
        route: '/tools/legal-advisor',
        icon: 'sparkles',
        sort_order: 1,
        is_active: true,
      },
      {
        id: '2',
        category_id: 'eb2fc65c-ed4d-42c7-8054-fef23857e28c',
        slug: 'legal-research',
        name: 'Legal Research',
        description: 'Comprehensive case law, acts, and precedent search engine',
        route: '/tools/legal-research',
        icon: 'search',
        sort_order: 2,
        is_active: true,
      },
    ],
  },
  {
    id: '9d232733-fa51-4358-9fd7-38424b41537d',
    slug: 'documents',
    name: 'Documents',
    description: 'Document comprehension, contract simplification, notice drafting, and secure legal storage',
    sort_order: 2,
    branch_position: {
      level: 2,
      height: 1.1,
      angle: 1.73,
      radius: 4.6,
      color: '#818cf8',
      glow: 'rgba(129, 140, 248, 0.4)',
    },
    tools: [
      {
        id: '3',
        category_id: '9d232733-fa51-4358-9fd7-38424b41537d',
        slug: 'document-analyzer',
        name: 'Document Analyzer',
        description: 'Extract hidden clauses, risks, and plain-English summaries from legal documents',
        route: '/tools/document-analyzer',
        icon: 'file-text',
        sort_order: 1,
        is_active: true,
      },
      {
        id: '4',
        category_id: '9d232733-fa51-4358-9fd7-38424b41537d',
        slug: 'drafting-assistant',
        name: 'Drafting Assistant',
        description: 'Guided drafting of formal legal letters, applications, complaints, and correspondence',
        route: '/tools/drafting-assistant',
        icon: 'pen-tool',
        sort_order: 2,
        is_active: true,
      },
      {
        id: '5',
        category_id: '9d232733-fa51-4358-9fd7-38424b41537d',
        slug: 'notice-reply',
        name: 'Notice Reply',
        description: 'Structured response generator for legal, demand, and statutory notices',
        route: '/tools/notice-reply',
        icon: 'mail',
        sort_order: 3,
        is_active: true,
      },
      {
        id: '6',
        category_id: '9d232733-fa51-4358-9fd7-38424b41537d',
        slug: 'legal-vault',
        name: 'Legal Vault',
        description: 'Private legal document repository to store, organize, preview, and search your legal files',
        route: '/tools/legal-vault',
        icon: 'folder-lock',
        sort_order: 4,
        is_active: true,
      },
    ],
  },
  {
    id: 'dd19ad74-d34c-4eaf-bb59-1065df14170a',
    slug: 'safety-help',
    name: 'Safety & Help',
    description: 'Fraud detection, evidence collation, lawyer preparation, and pro-bono aid navigation',
    sort_order: 3,
    branch_position: {
      level: 3,
      height: -1.1,
      angle: 3.66,
      radius: 4.8,
      color: '#38bdf8',
      glow: 'rgba(56, 189, 248, 0.4)',
    },
    tools: [
      {
        id: '7',
        category_id: 'dd19ad74-d34c-4eaf-bb59-1065df14170a',
        slug: 'scam-detector',
        name: 'Scam Detector',
        description: 'Scan suspicious messages, investment schemes, and phishing communications',
        route: '/tools/scam-detector',
        icon: 'shield-alert',
        sort_order: 1,
        is_active: true,
      },
      {
        id: '10',
        category_id: 'dd19ad74-d34c-4eaf-bb59-1065df14170a',
        slug: 'legal-aid-finder',
        name: 'Legal Aid Finder',
        description: 'Locate free legal aid clinics and State Legal Services Authorities across India',
        route: '/tools/legal-aid-finder',
        icon: 'heart-handshake',
        sort_order: 2,
        is_active: true,
      },
      {
        id: '9',
        category_id: 'dd19ad74-d34c-4eaf-bb59-1065df14170a',
        slug: 'lawyer-preparation',
        name: 'Lawyer Preparation',
        description: 'Prepare concise case briefs and essential questions before meeting an advocate',
        route: '/tools/lawyer-preparation',
        icon: 'briefcase',
        sort_order: 3,
        is_active: true,
      },
    ],
  },
  {
    id: '8d473691-fc37-4f33-86ae-71eb12d33d1e',
    slug: 'legal-tools',
    name: 'Legal Tools',
    description: 'Procedural court trackers, litigation cost calculators, and penal code converters',
    sort_order: 4,
    branch_position: {
      level: 4,
      height: -3.2,
      angle: 5.41,
      radius: 4.6,
      color: '#a855f7',
      glow: 'rgba(168, 85, 247, 0.4)',
    },
    tools: [
      {
        id: '11',
        category_id: '8d473691-fc37-4f33-86ae-71eb12d33d1e',
        slug: 'case-status-tracker',
        name: 'Case Status Tracker',
        description: 'Unified CNR case inquiry across High Courts, District Courts, and Supreme Court',
        route: '/tools/case-status-tracker',
        icon: 'scale',
        sort_order: 1,
        is_active: true,
      },
      {
        id: '12',
        category_id: '8d473691-fc37-4f33-86ae-71eb12d33d1e',
        slug: 'court-fee-calculator',
        name: 'Court Fee Calculator',
        description: 'Estimate ad-valorem stamp duty and registry costs by jurisdiction',
        route: '/tools/court-fee-calculator',
        icon: 'calculator',
        sort_order: 2,
        is_active: true,
      },
      {
        id: '13',
        category_id: '8d473691-fc37-4f33-86ae-71eb12d33d1e',
        slug: 'provision-converter',
        name: 'Legal Provision Converter',
        description: 'Cross-reference provisions across IPC, BNS, CrPC, BNSS, Evidence Act, and BSA with plain-language explanations and practical examples',
        route: '/tools/provision-converter',
        icon: 'hash',
        sort_order: 3,
        is_active: true,
      },
    ],
  },
];

export function useTreeData() {
  const [categories, setCategories] = useState<CategoryItem[]>(INITIAL_CATEGORIES);
  const [selectedSlug, setSelectedSlug] = useState<string>('ai-assistance');
  const [selectedCategoryWithTools, setSelectedCategoryWithTools] = useState<CategoryItem | null>(INITIAL_CATEGORIES[0]);
  const [loading, setLoading] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getCategories();
      if (data && data.length > 0) {
        // Ensure safety-help category provides the exact 3 feature components
        const normalized = data.map((cat) => {
          if (cat.slug === 'safety-help') {
            const desiredTools = [
              {
                slug: 'scam-detector',
                name: 'Scam Detector',
                description: 'AI fraud & phishing analysis for suspicious messages and investment offers',
                route: '/tools/scam-detector',
                icon: 'shield-alert',
                sort_order: 1,
              },
              {
                slug: 'legal-aid-finder',
                name: 'Legal Aid Finder',
                description: 'Directory of DLSA, NALSA, and recognized pro-bono legal counsel',
                route: '/tools/legal-aid-finder',
                icon: 'heart-handshake',
                sort_order: 2,
              },
              {
                slug: 'lawyer-preparation',
                name: 'Lawyer Preparation',
                description: 'Client case briefing pack generator for advocate consultations',
                route: '/tools/lawyer-preparation',
                icon: 'briefcase',
                sort_order: 3,
              },
            ];

            const toolsList = desiredTools.map((desired, idx) => {
              const matched = (cat.tools || []).find(
                (t) =>
                  t.slug === desired.slug ||
                  (desired.slug === 'scam-detector' && t.slug === 'fraud-detection') ||
                  (desired.slug === 'legal-aid-finder' && t.slug === 'pro-bono-finder') ||
                  (desired.slug === 'lawyer-preparation' && t.slug === 'lawyer-prep')
              );
              return {
                id: matched?.id || `${cat.id}-${idx + 1}`,
                category_id: cat.id,
                slug: desired.slug,
                name: desired.name,
                description: matched?.description || desired.description,
                route: desired.route,
                icon: desired.icon,
                sort_order: desired.sort_order,
                is_active: true,
              };
            });

            return {
              ...cat,
              tools: toolsList,
            };
          }
          return cat;
        });

        setCategories(normalized);
        const current = normalized.find((c) => c.slug === selectedSlug) || normalized[0];
        setSelectedCategoryWithTools(current);
      }
    } catch (err: any) {
      setError(err?.message || null);
      console.warn('Using initial category snapshot:', err?.message);
    } finally {
      setLoading(false);
    }
  }, [selectedSlug]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // When selectedSlug changes, update active category
  useEffect(() => {
    if (!selectedSlug) return;

    const existing = categories.find((c) => c.slug === selectedSlug);
    if (existing && existing.tools && existing.tools.length > 0) {
      setSelectedCategoryWithTools(existing);
      return;
    }

    let isMounted = true;
    setCategoryLoading(true);

    apiClient
      .getCategoryBySlug(selectedSlug)
      .then((cat) => {
        if (isMounted) {
          setSelectedCategoryWithTools(cat);
          setCategoryLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to fetch category details:', err);
          setCategoryLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedSlug, categories]);

  const selectCategory = (slug: string | null) => {
    if (!slug) return;
    setSelectedSlug(slug);
    const found = categories.find((c) => c.slug === slug);
    if (found) {
      setSelectedCategoryWithTools(found);
    }
  };

  return {
    categories,
    selectedSlug,
    selectedCategoryWithTools,
    selectCategory,
    loading,
    categoryLoading,
    error,
    refetch: fetchCategories,
  };
}

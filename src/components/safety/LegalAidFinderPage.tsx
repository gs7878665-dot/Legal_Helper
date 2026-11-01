import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HeartHandshake,
  ArrowLeft,
  Search,
  MapPin,
  Phone,
  ShieldCheck,
  Building,
  AlertCircle,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { AuthBadge } from '../auth/AuthBadge';
import type { LegalAidItem, LegalAidLocationsResponse } from '../../api/types';

export const LegalAidFinderPage: React.FC = () => {
  const navigate = useNavigate();

  // Search and filter state
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data state
  const [items, setItems] = useState<LegalAidItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Metadata dropdowns
  const [availableStates, setAvailableStates] = useState<string[]>([]);
  const [availableDistricts, setAvailableDistricts] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [locationsData, setLocationsData] = useState<LegalAidLocationsResponse | null>(null);

  // Detail Modal / Drawer state
  const [activeItem, setActiveItem] = useState<LegalAidItem | null>(null);

  // Load locations on mount
  useEffect(() => {
    async function loadMeta() {
      try {
        const locs = await apiClient.getLegalAidLocations();
        setLocationsData(locs);
        setAvailableStates(locs.states);
      } catch (err) {
        console.warn('Failed to load legal aid location metadata:', err);
      }
    }
    loadMeta();
  }, []);

  // Update available districts when state changes
  useEffect(() => {
    if (selectedState && selectedState !== 'all' && locationsData?.districts_by_state) {
      setAvailableDistricts(locationsData.districts_by_state[selectedState] || []);
      setSelectedDistrict('all');
    } else {
      setAvailableDistricts([]);
      setSelectedDistrict('all');
    }
  }, [selectedState, locationsData]);

  // Execute Search
  const fetchLegalAid = async (pageToFetch = 1) => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.searchLegalAid({
        state: selectedState,
        district: selectedDistrict,
        category: selectedCategory,
        q: searchQuery,
        page: pageToFetch,
        pageSize: 12,
      });

      setItems(res.items);
      setTotal(res.total);
      setPage(res.page);
      setTotalPages(res.total_pages);
      if (res.available_categories && availableCategories.length === 0) {
        setAvailableCategories(res.available_categories);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch verified legal aid centers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLegalAid(1);
  }, [selectedState, selectedDistrict, selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLegalAid(1);
  };

  const handleResetFilters = () => {
    setSelectedState('all');
    setSelectedDistrict('all');
    setSelectedCategory('all');
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-[#030308] text-white flex flex-col font-sans selection:bg-cyan-500/30">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 bg-[#050510]/80 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/explore')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all text-xs font-mono"
            title="Return to Tree of Knowledge"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Tree of Knowledge</span>
          </button>

          <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <HeartHandshake className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-wide text-white">Legal Aid Finder</h1>
              <p className="text-[11px] text-gray-400 hidden md:block">
                Discover verified free legal aid clinics, State Legal Services Authorities, and NALSA centres across India
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <AuthBadge />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 flex flex-col gap-6">
        {/* Header Hero Banner */}
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-emerald-950/30 via-[#070b13] to-slate-950/80 border border-emerald-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 text-xs font-mono border border-emerald-500/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Section 12, Legal Services Authorities Act, 1987</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-light tracking-wide text-white">
              Free Legal Representation is Your Statutory Right
            </h2>
            <p className="text-xs text-gray-300 leading-relaxed">
              In India, women, children, members of SC/ST communities, industrial workmen, persons with disabilities,
              and individuals whose annual income falls below statutory limits are entitled to free legal counsel
              and court representation through National & State Legal Services Authorities.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-black/40 border border-white/10 text-xs text-gray-300 space-y-2 shrink-0">
            <div className="flex items-center gap-2 text-white font-medium">
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>National Legal Aid Helpline</span>
            </div>
            <div className="text-lg font-mono font-bold text-emerald-400">15100</div>
            <p className="text-[10px] text-gray-400 max-w-[200px]">
              Toll-free 24x7 service provided by the National Legal Services Authority (NALSA).
            </p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 sm:p-6 rounded-2xl bg-[#070913] border border-white/10 space-y-4 shadow-lg">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search by center name, city, address, or service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0c101d] border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400"
              />
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold tracking-wide transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search Services</span>
            </button>
          </form>

          {/* Filter Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/5">
            {/* State filter */}
            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1">State</label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full bg-[#0c101d] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
              >
                <option value="all">All States / UTs</option>
                {availableStates.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* District filter */}
            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1">District / City</label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                disabled={availableDistricts.length === 0}
                className="w-full bg-[#0c101d] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 disabled:opacity-40"
              >
                <option value="all">All Districts</option>
                {availableDistricts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Category filter */}
            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1">Assistance Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-[#0c101d] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
              >
                <option value="all">All Categories</option>
                {availableCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(selectedState !== 'all' || selectedDistrict !== 'all' || selectedCategory !== 'all' || searchQuery) && (
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-gray-400">
                Filters active · Showing {total} verified {total === 1 ? 'organization' : 'organizations'}
              </span>
              <button
                onClick={handleResetFilters}
                className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            </div>
          )}
        </div>

        {/* Results Grid */}
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-gray-400 font-mono">Querying verified legal aid directories across India...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-xs flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        ) : items.length === 0 ? (
          /* Honest Empty State */
          <div className="p-12 rounded-2xl bg-[#070913] border border-white/10 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 mx-auto">
              <Building className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h3 className="text-sm font-semibold text-white">No Verified Centers Found for this Filter</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                We only display authoritative, verified legal aid clinics and authorities. We do not generate placeholder or unverified clinics.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white transition-colors"
              >
                Clear All Filters
              </button>
              <a
                href="https://nalsa.gov.in"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs border border-emerald-500/40 hover:bg-emerald-500/30 transition-colors inline-flex items-center gap-1.5"
              >
                <span>Visit NALSA Portal</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ) : (
          /* Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => setActiveItem(item)}
                className="p-5 rounded-2xl bg-[#070913] hover:bg-[#090d1c] border border-white/10 hover:border-emerald-500/40 transition-all cursor-pointer flex flex-col justify-between gap-4 group shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono border border-emerald-500/30">
                      {item.category}
                    </span>
                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-gray-500" />
                      <span>{item.district}, {item.state}</span>
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors line-clamp-2">
                    {item.name}
                  </h3>

                  <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                    {item.address}
                  </p>
                </div>

                <div className="space-y-2 pt-3 border-t border-white/5 text-[11px]">
                  {item.phone && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{item.phone}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1">
                    <span>Source: {item.source_name}</span>
                    <span className="text-emerald-400 font-medium">View Details →</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              onClick={() => fetchLegalAid(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs text-gray-400 px-2 font-mono">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => fetchLegalAid(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}

        {/* Detail Modal */}
        {activeItem && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#090b14] border border-emerald-500/30 rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setActiveItem(null)}
                className="absolute top-5 right-5 text-gray-400 hover:text-white text-lg cursor-pointer"
              >
                &times;
              </button>

              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 text-[11px] font-mono border border-emerald-500/30 mb-2">
                  <span>{activeItem.category}</span>
                </div>
                <h3 className="text-lg font-semibold text-white">{activeItem.name}</h3>
                <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{activeItem.district}, {activeItem.state}</span>
                </p>
              </div>

              {/* Address & Contact Info */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2.5 text-xs">
                <div>
                  <span className="text-gray-400 block text-[11px]">Address:</span>
                  <span className="text-gray-200">{activeItem.address}</span>
                </div>
                {activeItem.phone && (
                  <div>
                    <span className="text-gray-400 block text-[11px]">Phone / Helpline:</span>
                    <span className="text-emerald-300 font-mono">{activeItem.phone}</span>
                  </div>
                )}
                {activeItem.email && (
                  <div>
                    <span className="text-gray-400 block text-[11px]">Email:</span>
                    <span className="text-gray-200">{activeItem.email}</span>
                  </div>
                )}
                {activeItem.website && (
                  <div>
                    <span className="text-gray-400 block text-[11px]">Website:</span>
                    <a
                      href={activeItem.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-400 hover:underline flex items-center gap-1 mt-0.5"
                    >
                      <span>{activeItem.website}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* Eligibility Information */}
              {activeItem.eligibility_info && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-semibold text-emerald-300">Eligibility Criteria</h4>
                  <p className="text-xs text-gray-300 leading-relaxed p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
                    {activeItem.eligibility_info}
                  </p>
                  <p className="text-[10px] text-gray-500 italic">
                    Eligibility is subject to verification by the respective Legal Services Authority under Section 12 of the Legal Services Authorities Act, 1987.
                  </p>
                </div>
              )}

              {/* Services Offered */}
              {activeItem.services_offered?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-white">Services Provided</h4>
                  <div className="flex flex-wrap gap-2">
                    {activeItem.services_offered.map((svc, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300"
                      >
                        {svc}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Source & Verification */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-500">
                <span>Verified Source: {activeItem.source_name}</span>
                {activeItem.verification_date && (
                  <span>Last Verified: {activeItem.verification_date}</span>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

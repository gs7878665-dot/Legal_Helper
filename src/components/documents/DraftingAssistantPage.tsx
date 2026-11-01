import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  PenTool,
  FileText,
  FileCheck2,
  AlertCircle,
  Copy,
  Check,
  Download,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Building,
  User as UserIcon,
  BookOpen,
  Save,
  Send,
  Scale
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { AuthBadge } from '../auth/AuthBadge';
import type {
  LegalDraftItem,
  DocumentTypeCode,
  ToneCode,
  DraftStructuredInputs
} from '../../api/types';

interface DocumentTypeOption {
  code: DocumentTypeCode;
  title: string;
  description: string;
  example: string;
  icon: typeof FileText;
}

const DOCUMENT_TYPES: DocumentTypeOption[] = [
  {
    code: 'formal_letter',
    title: 'Formal Legal Letter',
    description: 'Structured formal communication demanding action, setting deadlines, or documenting rights.',
    example: 'Security deposit recovery, landlord-tenant communication, employer demand.',
    icon: FileText,
  },
  {
    code: 'legal_representation',
    title: 'Legal Representation / Application',
    description: 'Formal representation or petition submitted before government authorities, boards, or tribunals.',
    example: 'Municipal grievance, RTI application, bank ombudsman submission.',
    icon: Scale,
  },
  {
    code: 'formal_complaint',
    title: 'Formal Complaint',
    description: 'Detailed grievance highlighting statutory infractions, service deficiencies, or statutory breaches.',
    example: 'Consumer forum complaint, police grievance cell, housing society dispute.',
    icon: AlertCircle,
  },
  {
    code: 'general_correspondence',
    title: 'General Legal Correspondence',
    description: 'Professional, legally sound correspondence for business or personal dispute resolution.',
    example: 'Contract clarification, vendor dispute settlement, amicable resolution inquiry.',
    icon: PenTool,
  },
];

const PRESET_TEMPLATES = [
  {
    title: 'Deposit Refund Demand Letter',
    type: 'formal_letter' as DocumentTypeCode,
    tone: 'firm' as ToneCode,
    subject: 'Urgent Demand for Immediate Refund of Security Deposit',
    purpose: 'Refund of interest-free security deposit of INR 1,50,000 withheld post tenancy termination.',
    outcome: 'Full remittance of deposit within 7 calendar days to avoid legal action.',
    senderName: 'Rohan Gupta',
    senderAddress: 'Flat 204, Palm Meadows, Whitefield, Bengaluru',
    senderPhone: '+91 98765 43210',
    senderEmail: 'rohan.gupta@example.com',
    senderRole: 'Former Tenant',
    recipientName: 'Mr. Vikram Varma',
    recipientDesig: 'Lessor / Property Owner',
    recipientAddress: '#42, 12th Cross, Indiranagar, Bengaluru - 560038',
    dateOfDrafting: new Date().toISOString().split('T')[0],
    incidentDate: '2026-10-15',
    refNo: 'LEASE-BLR-2026-09',
    deadline: '7 calendar days from receipt',
    whatHappened: 'Tenancy of 11 months concluded on 15th October 2026. Handover of vacant possession completed with zero arrears, yet refund was arbitrarily withheld without damage receipts.',
    background: 'Two months prior written notice served as stipulated in Clause 5 of the rental agreement.',
    legalProvisions: 'Sections 73 and 74 of the Indian Contract Act, 1872',
    actionRequired: 'Remit full deposit sum of INR 1,50,000 to sender bank account without unauthorized deductions.',
  },
  {
    title: 'Defective Product Consumer Complaint',
    type: 'formal_complaint' as DocumentTypeCode,
    tone: 'firm' as ToneCode,
    subject: 'Formal Complaint regarding Defective Appliance & Deficiency in Service',
    purpose: 'Demand for replacement or complete refund under Consumer Protection Act, 2019.',
    outcome: 'Immediate replacement or full refund of purchase price of INR 48,000.',
    senderName: 'Priya Sharma',
    senderAddress: 'B-102, Silver Oak Towers, Pune, Maharashtra',
    senderPhone: '+91 98220 11223',
    senderEmail: 'priya.sharma@example.com',
    senderRole: 'Aggrieved Consumer',
    recipientName: 'ElectroTech India Pvt Ltd (Customer Grievance Redressal Officer)',
    recipientDesig: 'Nodal Grievance Officer',
    recipientAddress: 'Level 4, Tech Park, Viman Nagar, Pune - 411014',
    dateOfDrafting: new Date().toISOString().split('T')[0],
    incidentDate: '2026-09-28',
    refNo: 'INV-2026-88741',
    deadline: '15 days',
    whatHappened: 'Purchased smart washing machine which ceased functioning within 14 days. Technician visited twice but failed to repair defect.',
    background: 'Product is under active 2-year comprehensive manufacturer warranty.',
    legalProvisions: 'Section 2(11) Deficiency in Service, Consumer Protection Act, 2019',
    actionRequired: 'Replace defective unit with a brand new unit or refund entire invoice value of INR 48,000.',
  }
];

export const DraftingAssistantPage: React.FC = () => {
  const navigate = useNavigate();

  // 4 Stages: 1 = Choose Type, 2 = Enter Details, 3 = Review & Generate, 4 = Editor & Export
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [documentType, setDocumentType] = useState<DocumentTypeCode>('formal_letter');
  const [title, setTitle] = useState('');
  const [tone, setTone] = useState<ToneCode>('formal');
  const [purpose, setPurpose] = useState('');
  const [desiredOutcome, setDesiredOutcome] = useState('');
  const jurisdiction = 'India';
  const language = 'en';

  // Sender details
  const [senderName, setSenderName] = useState('');
  const [senderAddress, setSenderAddress] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderRole, setSenderRole] = useState('');

  // Recipient details
  const [recipientName, setRecipientName] = useState('');
  const [recipientDesig, setRecipientDesig] = useState('');
  const [recipientDept, setRecipientDept] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');

  // Dates & references
  const [dateOfDrafting, setDateOfDrafting] = useState(new Date().toISOString().split('T')[0]);
  const [incidentDate, setIncidentDate] = useState('');
  const [refNo, setRefNo] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');

  // Facts & circumstances
  const [whatHappened, setWhatHappened] = useState('');
  const [background, setBackground] = useState('');
  const [previousCommunication, setPreviousCommunication] = useState('');
  const [supportingExcerpt, setSupportingExcerpt] = useState('');
  const [legalProvisions, setLegalProvisions] = useState('');

  // Requested Action
  const [actionRequired, setActionRequired] = useState('');
  const [requestedRemedy, setRequestedRemedy] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  // Execution & Persistence State
  const [activeDraft, setActiveDraft] = useState<LegalDraftItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [copiedState, setCopiedState] = useState(false);

  // Editor Content state
  const [editorText, setEditorText] = useState('');
  const [regenInstructions, setRegenInstructions] = useState('');
  const [showRegenModal, setShowRegenModal] = useState(false);

  // Load Template preset
  const handleLoadTemplate = (tpl: typeof PRESET_TEMPLATES[0]) => {
    setDocumentType(tpl.type);
    setTitle(tpl.subject);
    setTone(tpl.tone);
    setPurpose(tpl.purpose);
    setDesiredOutcome(tpl.outcome);
    setSenderName(tpl.senderName);
    setSenderAddress(tpl.senderAddress);
    setSenderPhone(tpl.senderPhone);
    setSenderEmail(tpl.senderEmail);
    setSenderRole(tpl.senderRole);
    setRecipientName(tpl.recipientName);
    setRecipientDesig(tpl.recipientDesig);
    setRecipientAddress(tpl.recipientAddress);
    setDateOfDrafting(tpl.dateOfDrafting);
    setIncidentDate(tpl.incidentDate);
    setRefNo(tpl.refNo);
    setDeadlineDate(tpl.deadline);
    setWhatHappened(tpl.whatHappened);
    setBackground(tpl.background);
    setLegalProvisions(tpl.legalProvisions);
    setActionRequired(tpl.actionRequired);
    setCurrentStep(2);
  };

  const buildStructuredInputs = (): DraftStructuredInputs => {
    return {
      basics: {
        document_type: documentType,
        title: title.trim() || `Formal ${documentType.replace('_', ' ')}`,
        purpose: purpose.trim() || undefined,
        desired_outcome: desiredOutcome.trim() || undefined,
        jurisdiction,
        language,
        tone,
      },
      sender: {
        full_name: senderName.trim(),
        address: senderAddress.trim() || undefined,
        email: senderEmail.trim() || undefined,
        phone: senderPhone.trim() || undefined,
        role: senderRole.trim() || undefined,
      },
      recipient: {
        full_name: recipientName.trim(),
        designation: recipientDesig.trim() || undefined,
        department: recipientDept.trim() || undefined,
        address: recipientAddress.trim() || undefined,
      },
      dates_and_references: {
        date_of_drafting: dateOfDrafting || undefined,
        incident_date: incidentDate || undefined,
        reference_number: refNo.trim() || undefined,
        deadline_date: deadlineDate.trim() || undefined,
      },
      facts_and_circumstances: {
        what_happened: whatHappened.trim(),
        background: background.trim() || undefined,
        previous_communication: previousCommunication.trim() || undefined,
        supporting_material_excerpt: supportingExcerpt.trim() || undefined,
        legal_provisions: legalProvisions.trim() || undefined,
      },
      requested_action: {
        what_should_recipient_do: actionRequired.trim(),
        requested_remedy: requestedRemedy.trim() || undefined,
        desired_deadline: deadlineDate.trim() || undefined,
        additional_instructions: additionalInstructions.trim() || undefined,
      },
    };
  };

  // Validation before going to Review (Stage 3)
  const validateDetailsStep = (): boolean => {
    setErrorMessage(null);
    if (!title.trim()) {
      setErrorMessage('Please provide a subject or title for the document.');
      return false;
    }
    if (!senderName.trim()) {
      setErrorMessage('Please provide the full name of the sender.');
      return false;
    }
    if (!recipientName.trim()) {
      setErrorMessage('Please provide the recipient name or organization.');
      return false;
    }
    if (!whatHappened.trim() || whatHappened.trim().length < 10) {
      setErrorMessage('Please describe what happened (at least 10 characters).');
      return false;
    }
    if (!actionRequired.trim() || actionRequired.trim().length < 5) {
      setErrorMessage('Please specify what action the recipient should take.');
      return false;
    }
    return true;
  };

  // Save or Update draft
  const handleSaveDraft = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccessMsg(null);
    try {
      const structured = buildStructuredInputs();
      if (activeDraft) {
        const updated = await apiClient.updateDraft(activeDraft.id, {
          title: title.trim() || activeDraft.title,
          tone,
          language,
          structured_inputs: structured,
          user_edited_content: editorText || undefined,
        });
        setActiveDraft(updated);
      } else {
        const created = await apiClient.createDraft({
          document_type: documentType,
          title: title.trim() || `Draft ${documentType.replace('_', ' ')}`,
          tone,
          language,
          jurisdiction,
          structured_inputs: structured,
        });
        setActiveDraft(created);
      }
      setSaveSuccessMsg('Draft progress successfully saved.');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save draft.');
    } finally {
      setIsSaving(false);
    }
  };

  // Generate Draft (Stage 3 -> Stage 4)
  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const structured = buildStructuredInputs();
      let draftId = activeDraft?.id;

      if (!draftId) {
        const created = await apiClient.createDraft({
          document_type: documentType,
          title: title.trim(),
          tone,
          language,
          jurisdiction,
          structured_inputs: structured,
        });
        setActiveDraft(created);
        draftId = created.id;
      } else {
        await apiClient.updateDraft(draftId, {
          title: title.trim(),
          tone,
          language,
          structured_inputs: structured,
        });
      }

      const generatedDraft = await apiClient.generateDraft(draftId);
      setActiveDraft(generatedDraft);
      setEditorText(generatedDraft.user_edited_content || generatedDraft.generated_content || '');
      setCurrentStep(4);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Draft generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Regenerate with instructions
  const handleRegenerate = async () => {
    if (!activeDraft) return;
    setIsRegenerating(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.regenerateDraft(activeDraft.id, {
        additional_instructions: regenInstructions.trim() || undefined,
      });
      setActiveDraft(res);
      setEditorText(res.user_edited_content || res.generated_content || '');
      setShowRegenModal(false);
      setRegenInstructions('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Regeneration failed.');
    } finally {
      setIsRegenerating(false);
    }
  };

  // Save manual edits in editor
  const handleSaveEditor = async () => {
    if (!activeDraft) return;
    setIsSaving(true);
    try {
      const updated = await apiClient.updateDraft(activeDraft.id, {
        user_edited_content: editorText,
        status: 'edited',
      });
      setActiveDraft(updated);
      setSaveSuccessMsg('Document edits saved successfully.');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  // Copy Document text
  const handleCopyText = () => {
    navigator.clipboard.writeText(editorText);
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 2200);
  };

  // Download as TXT
  const handleDownloadTxt = () => {
    const element = document.createElement('a');
    const file = new Blob([editorText], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    const safeTitle = (title.trim() || 'legal_draft').replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
    element.download = `${safeTitle}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Reset / New Draft
  const handleNewDraft = () => {
    setActiveDraft(null);
    setTitle('');
    setPurpose('');
    setDesiredOutcome('');
    setSenderName('');
    setSenderAddress('');
    setSenderEmail('');
    setSenderPhone('');
    setSenderRole('');
    setRecipientName('');
    setRecipientDesig('');
    setRecipientDept('');
    setRecipientAddress('');
    setIncidentDate('');
    setRefNo('');
    setDeadlineDate('');
    setWhatHappened('');
    setBackground('');
    setPreviousCommunication('');
    setSupportingExcerpt('');
    setLegalProvisions('');
    setActionRequired('');
    setRequestedRemedy('');
    setAdditionalInstructions('');
    setEditorText('');
    setErrorMessage(null);
    setCurrentStep(1);
  };

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 flex flex-col font-sans relative selection:bg-indigo-500/30">
      {/* Background ambient lighting */}
      <div className="fixed top-0 left-1/3 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-indigo-950/20 via-violet-950/25 to-cyan-900/15 blur-[140px] pointer-events-none rounded-full" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[300px] bg-indigo-950/20 blur-[130px] pointer-events-none rounded-full" />

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#070913]/85 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/explore')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 text-xs text-slate-300 hover:text-cyan-400 transition-all cursor-pointer"
            title="Return to Tree of Knowledge"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Explore Tree</span>
          </button>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(99,102,241,0.25)]">
              <PenTool className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-wide flex items-center gap-2 text-white">
                <span>Drafting Assistant</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                  India Jurisdiction
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 hidden md:block">
                Guided creation of formal legal letters, representations, complaints, and legal correspondence
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handleNewDraft}
              className="text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors cursor-pointer hidden sm:block"
            >
              + New Draft
            </button>
          )}
          <AuthBadge />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6 relative z-10">
        {/* Step Indicator Progress Bar */}
        <div className="p-3.5 rounded-2xl bg-[#0b0f24]/90 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto py-1">
            {[
              { num: 1, label: 'Document Type' },
              { num: 2, label: 'Enter Details' },
              { num: 3, label: 'Review & Verify' },
              { num: 4, label: 'Edit & Export' },
            ].map((step) => {
              const isActive = currentStep === step.num;
              const isPast = currentStep > step.num;
              return (
                <button
                  key={step.num}
                  type="button"
                  disabled={step.num > currentStep}
                  onClick={() => {
                    if (step.num < currentStep) setCurrentStep(step.num as any);
                  }}
                  className={`flex items-center gap-2 text-xs font-mono transition-all ${
                    isActive
                      ? 'text-cyan-300 font-bold'
                      : isPast
                      ? 'text-indigo-300 hover:text-white cursor-pointer'
                      : 'text-slate-600 cursor-not-allowed'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                      isActive
                        ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                        : isPast
                        ? 'bg-indigo-600/30 border border-indigo-500/50 text-indigo-300'
                        : 'bg-slate-900 border border-slate-800 text-slate-600'
                    }`}
                  >
                    {isPast ? <Check className="w-3.5 h-3.5" /> : step.num}
                  </span>
                  <span className="whitespace-nowrap">{step.label}</span>
                  {step.num < 4 && <ChevronRight className="w-3.5 h-3.5 text-slate-700 ml-1" />}
                </button>
              );
            })}
          </div>

          {/* Quick Actions (Save progress) */}
          <div className="flex items-center gap-2">
            {saveSuccessMsg && (
              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 animate-fadeIn">
                <Check className="w-3 h-3" />
                <span>{saveSuccessMsg}</span>
              </span>
            )}
            {currentStep >= 2 && currentStep <= 3 && (
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <Save className="w-3 h-3 text-cyan-400" />
                <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/40 text-xs text-red-200 flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-xs text-red-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 1: Choose Document Type */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <div className="flex flex-col gap-6">
            <div className="text-center sm:text-left">
              <h2 className="text-lg font-semibold text-white tracking-wide">
                Select Your Legal Document Type
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Choose the structure that matches your purpose. Each template enforces formal Indian legal conventions, structured chronological facts, and rigorous demand clauses.
              </p>
            </div>

            {/* Document Type Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DOCUMENT_TYPES.map((dt) => {
                const Icon = dt.icon;
                const isSelected = documentType === dt.code;
                return (
                  <button
                    key={dt.code}
                    type="button"
                    onClick={() => setDocumentType(dt.code)}
                    className={`p-5 rounded-2xl text-left border transition-all duration-200 flex flex-col justify-between gap-4 cursor-pointer relative overflow-hidden group ${
                      isSelected
                        ? 'bg-[#0e1438] border-cyan-500/60 shadow-[0_0_24px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/40'
                        : 'bg-[#0b0f24]/70 hover:bg-[#0c122e] border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isSelected ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-900 text-slate-400 group-hover:text-cyan-400'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        {isSelected && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                            Selected
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-white group-hover:text-cyan-200 transition-colors">
                        {dt.title}
                      </h3>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {dt.description}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800/60 text-[11px] text-slate-400 font-mono">
                      <span className="text-slate-500 font-sans block text-[10px] uppercase font-semibold mb-0.5">Common Use Cases:</span>
                      <span>{dt.example}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick Templates */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Or start with a pre-configured scenario:</span>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {PRESET_TEMPLATES.map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleLoadTemplate(tpl)}
                    className="p-3.5 rounded-xl bg-[#0b0f24]/60 hover:bg-[#0e1430] border border-slate-800/80 hover:border-indigo-500/40 text-left transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div>
                      <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors block">
                        {tpl.title}
                      </span>
                      <span className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {tpl.purpose}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all shrink-0 ml-3" />
                  </button>
                ))}
              </div>
            </div>

            {/* Continue Button */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-semibold font-mono tracking-wide shadow-lg shadow-indigo-900/30 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Proceed to Document Details</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 2: Guided Details Form */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white tracking-wide">
                  Document Details & Chronology
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Type: <span className="text-cyan-300 font-mono capitalize">{documentType.replace('_', ' ')}</span> · Indian Jurisdiction
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400">Tone:</span>
                {(['formal', 'polite', 'firm', 'neutral'] as ToneCode[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTone(t)}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono capitalize transition-colors cursor-pointer ${
                      tone === t ? 'bg-indigo-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (validateDetailsStep()) setCurrentStep(3);
              }}
              className="flex flex-col gap-6"
            >
              {/* SECTION A: Document Basics */}
              <div className="p-5 rounded-2xl bg-[#0b0f24]/90 border border-slate-800/80 flex flex-col gap-4">
                <h3 className="text-xs font-semibold text-cyan-300 uppercase tracking-wider font-mono flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" />
                  <span>A. Document Subject & Desired Outcome</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-xs text-slate-300 font-mono block mb-1.5">
                      Subject / Document Title <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Formal Demand for Immediate Refund of Security Deposit"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#07091a] border border-slate-800 focus:border-cyan-500/70 text-xs text-white placeholder-slate-600 outline-none transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 font-mono block mb-1.5">
                      Purpose of this Document (Optional)
                    </label>
                    <input
                      type="text"
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      placeholder="e.g. Seeking recovery of withheld security deposit post-tenancy"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#07091a] border border-slate-800 focus:border-cyan-500/70 text-xs text-white placeholder-slate-600 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 font-mono block mb-1.5">
                      Desired Outcome / Settlement (Optional)
                    </label>
                    <input
                      type="text"
                      value={desiredOutcome}
                      onChange={(e) => setDesiredOutcome(e.target.value)}
                      placeholder="e.g. Direct bank transfer of ₹1,50,000 within 7 days"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#07091a] border border-slate-800 focus:border-cyan-500/70 text-xs text-white placeholder-slate-600 outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION B & C: Sender & Recipient Details */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Sender */}
                <div className="p-5 rounded-2xl bg-[#0b0f24]/90 border border-slate-800/80 flex flex-col gap-4">
                  <h3 className="text-xs font-semibold text-indigo-300 uppercase tracking-wider font-mono flex items-center gap-2">
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>B. Sender Information (You)</span>
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-300 font-mono block mb-1">
                        Full Legal Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        placeholder="e.g. Rohan Gupta"
                        className="w-full px-3 py-2 rounded-xl bg-[#07091a] border border-slate-800 text-xs text-white placeholder-slate-600 outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-300 font-mono block mb-1">
                        Address (Optional)
                      </label>
                      <input
                        type="text"
                        value={senderAddress}
                        onChange={(e) => setSenderAddress(e.target.value)}
                        placeholder="e.g. Flat 204, Palm Meadows, Bengaluru"
                        className="w-full px-3 py-2 rounded-xl bg-[#07091a] border border-slate-800 text-xs text-white placeholder-slate-600 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-slate-300 font-mono block mb-1">Phone (Optional)</label>
                        <input
                          type="text"
                          value={senderPhone}
                          onChange={(e) => setSenderPhone(e.target.value)}
                          placeholder="+91..."
                          className="w-full px-3 py-2 rounded-xl bg-[#07091a] border border-slate-800 text-xs text-white placeholder-slate-600 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-300 font-mono block mb-1">Email (Optional)</label>
                        <input
                          type="email"
                          value={senderEmail}
                          onChange={(e) => setSenderEmail(e.target.value)}
                          placeholder="email@..."
                          className="w-full px-3 py-2 rounded-xl bg-[#07091a] border border-slate-800 text-xs text-white placeholder-slate-600 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-300 font-mono block mb-1">
                        Role / Capacity (Optional)
                      </label>
                      <input
                        type="text"
                        value={senderRole}
                        onChange={(e) => setSenderRole(e.target.value)}
                        placeholder="e.g. Former Tenant / Consumer / Aggrieved Citizen"
                        className="w-full px-3 py-2 rounded-xl bg-[#07091a] border border-slate-800 text-xs text-white placeholder-slate-600 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Recipient */}
                <div className="p-5 rounded-2xl bg-[#0b0f24]/90 border border-slate-800/80 flex flex-col gap-4">
                  <h3 className="text-xs font-semibold text-indigo-300 uppercase tracking-wider font-mono flex items-center gap-2">
                    <Building className="w-3.5 h-3.5" />
                    <span>C. Recipient Information</span>
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-300 font-mono block mb-1">
                        Full Name or Organization <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="e.g. Vikram Varma or ElectroTech India Pvt Ltd"
                        className="w-full px-3 py-2 rounded-xl bg-[#07091a] border border-slate-800 text-xs text-white placeholder-slate-600 outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-300 font-mono block mb-1">
                        Designation / Department (Optional)
                      </label>
                      <input
                        type="text"
                        value={recipientDesig}
                        onChange={(e) => setRecipientDesig(e.target.value)}
                        placeholder="e.g. Property Owner / Head of Grievance Redressal"
                        className="w-full px-3 py-2 rounded-xl bg-[#07091a] border border-slate-800 text-xs text-white placeholder-slate-600 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-300 font-mono block mb-1">
                        Recipient Address (Optional)
                      </label>
                      <input
                        type="text"
                        value={recipientAddress}
                        onChange={(e) => setRecipientAddress(e.target.value)}
                        placeholder="e.g. #42, 12th Cross, Indiranagar, Bengaluru"
                        className="w-full px-3 py-2 rounded-xl bg-[#07091a] border border-slate-800 text-xs text-white placeholder-slate-600 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION D: Dates & References */}
              <div className="p-5 rounded-2xl bg-[#0b0f24]/90 border border-slate-800/80 flex flex-col gap-4">
                <h3 className="text-xs font-semibold text-amber-300 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>D. Key Dates & Reference Numbers</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs text-slate-300 font-mono block mb-1">Date of Drafting</label>
                    <input
                      type="date"
                      value={dateOfDrafting}
                      onChange={(e) => setDateOfDrafting(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#07091a] border border-slate-800 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 font-mono block mb-1">Incident / Occurrence Date</label>
                    <input
                      type="date"
                      value={incidentDate}
                      onChange={(e) => setIncidentDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#07091a] border border-slate-800 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 font-mono block mb-1">Reference No. (Optional)</label>
                    <input
                      type="text"
                      value={refNo}
                      onChange={(e) => setRefNo(e.target.value)}
                      placeholder="e.g. AGREEMENT-2026-99"
                      className="w-full px-3 py-2 rounded-xl bg-[#07091a] border border-slate-800 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 font-mono block mb-1">Response Deadline</label>
                    <input
                      type="text"
                      value={deadlineDate}
                      onChange={(e) => setDeadlineDate(e.target.value)}
                      placeholder="e.g. 7 days or 15 days"
                      className="w-full px-3 py-2 rounded-xl bg-[#07091a] border border-slate-800 text-xs text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION E: Facts & Chronology */}
              <div className="p-5 rounded-2xl bg-[#0b0f24]/90 border border-slate-800/80 flex flex-col gap-4">
                <h3 className="text-xs font-semibold text-cyan-300 uppercase tracking-wider font-mono flex items-center gap-2">
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>E. Chronological Facts & Background</span>
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-300 font-mono block mb-1.5">
                      What happened? (Chronological Core Facts) <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      rows={4}
                      value={whatHappened}
                      onChange={(e) => setWhatHappened(e.target.value)}
                      placeholder="Describe the sequence of events clearly in plain language. Dates, amounts, and specific defaults should be noted..."
                      className="w-full p-3 rounded-xl bg-[#07091a] border border-slate-800 focus:border-cyan-500/70 text-xs text-white placeholder-slate-600 outline-none resize-none leading-relaxed"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-300 font-mono block mb-1">
                        Relevant Background Context (Optional)
                      </label>
                      <textarea
                        rows={2}
                        value={background}
                        onChange={(e) => setBackground(e.target.value)}
                        placeholder="e.g. Prior amicable relationship, terms of initial agreement..."
                        className="w-full p-2.5 rounded-xl bg-[#07091a] border border-slate-800 text-xs text-white placeholder-slate-600 outline-none resize-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-300 font-mono block mb-1">
                        Prior Communications / Notices Sent (Optional)
                      </label>
                      <textarea
                        rows={2}
                        value={previousCommunication}
                        onChange={(e) => setPreviousCommunication(e.target.value)}
                        placeholder="e.g. Written reminder email sent on 20th October was ignored..."
                        className="w-full p-2.5 rounded-xl bg-[#07091a] border border-slate-800 text-xs text-white placeholder-slate-600 outline-none resize-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-300 font-mono block mb-1">
                        Relevant Excerpts or Quotations (Optional)
                      </label>
                      <input
                        type="text"
                        value={supportingExcerpt}
                        onChange={(e) => setSupportingExcerpt(e.target.value)}
                        placeholder="e.g. Clause 4 stating refund within 15 days..."
                        className="w-full px-3 py-2 rounded-xl bg-[#07091a] border border-slate-800 text-xs text-white placeholder-slate-600 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-300 font-mono block mb-1">
                        Known Legal Provisions or Acts (Optional)
                      </label>
                      <input
                        type="text"
                        value={legalProvisions}
                        onChange={(e) => setLegalProvisions(e.target.value)}
                        placeholder="e.g. Section 73 Indian Contract Act or Consumer Protection Act"
                        className="w-full px-3 py-2 rounded-xl bg-[#07091a] border border-slate-800 text-xs text-white placeholder-slate-600 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION F: Requested Action */}
              <div className="p-5 rounded-2xl bg-[#0b0f24]/90 border border-slate-800/80 flex flex-col gap-4">
                <h3 className="text-xs font-semibold text-emerald-300 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Send className="w-3.5 h-3.5" />
                  <span>F. Demands & Requested Action</span>
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-300 font-mono block mb-1.5">
                      What should the recipient specifically do? <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      rows={2}
                      value={actionRequired}
                      onChange={(e) => setActionRequired(e.target.value)}
                      placeholder="e.g. Immediately remit INR 1,50,000 into the sender's account ending in 4022..."
                      className="w-full p-3 rounded-xl bg-[#07091a] border border-slate-800 text-xs text-white placeholder-slate-600 outline-none resize-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 font-mono block mb-1">
                      Consequence / Closing Warning (Optional)
                    </label>
                    <input
                      type="text"
                      value={additionalInstructions}
                      onChange={(e) => setAdditionalInstructions(e.target.value)}
                      placeholder="e.g. Failing which formal civil suit and consumer litigation will be filed without further notice."
                      className="w-full px-3 py-2 rounded-xl bg-[#07091a] border border-slate-800 text-xs text-white placeholder-slate-600 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Step Navigation Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 font-mono flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to Type Selection</span>
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-semibold font-mono tracking-wide shadow-lg shadow-indigo-900/30 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>Review Draft Details</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 3: Review Before Generation */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-semibold text-white tracking-wide">
                Review Structured Document Information
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Ensure all names, dates, amounts, and factual demands are strictly accurate. The AI engine will ground the draft strictly on this data.
              </p>
            </div>

            {/* Review Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Card 1: Basics & Tone */}
              <div className="p-4 rounded-xl bg-[#0b0f24]/90 border border-slate-800 flex flex-col gap-2">
                <span className="text-[11px] font-mono text-cyan-400 uppercase font-semibold">Document Specifications</span>
                <p className="text-white font-semibold">{title}</p>
                <div className="text-slate-400 space-y-1 font-mono text-[11px] mt-1">
                  <p>Type: <span className="text-slate-200 capitalize">{documentType.replace('_', ' ')}</span></p>
                  <p>Tone: <span className="text-slate-200 capitalize">{tone}</span></p>
                  <p>Jurisdiction: <span className="text-slate-200">{jurisdiction}</span></p>
                  {purpose && <p>Purpose: <span className="text-slate-300">{purpose}</span></p>}
                </div>
              </div>

              {/* Card 2: Dates & Deadlines */}
              <div className="p-4 rounded-xl bg-[#0b0f24]/90 border border-slate-800 flex flex-col gap-2">
                <span className="text-[11px] font-mono text-amber-400 uppercase font-semibold">Timeline & References</span>
                <div className="text-slate-400 space-y-1 font-mono text-[11px] mt-1">
                  <p>Drafting Date: <span className="text-slate-200">{dateOfDrafting}</span></p>
                  {incidentDate && <p>Incident Date: <span className="text-slate-200">{incidentDate}</span></p>}
                  {refNo && <p>Reference No: <span className="text-slate-200">{refNo}</span></p>}
                  <p>Deadline / Notice Period: <span className="text-slate-200">{deadlineDate || '15 days (default)'}</span></p>
                </div>
              </div>

              {/* Card 3: Parties */}
              <div className="p-4 rounded-xl bg-[#0b0f24]/90 border border-slate-800 flex flex-col gap-2">
                <span className="text-[11px] font-mono text-indigo-400 uppercase font-semibold">Sender & Recipient</span>
                <div className="space-y-2 mt-1">
                  <div>
                    <span className="text-slate-500 font-mono text-[10px] block">FROM:</span>
                    <p className="text-slate-200 font-semibold">{senderName}</p>
                    <p className="text-slate-400 text-[11px] font-mono">{senderAddress || '[Address Placeholder]'}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-800/80">
                    <span className="text-slate-500 font-mono text-[10px] block">TO:</span>
                    <p className="text-slate-200 font-semibold">{recipientName}</p>
                    {recipientDesig && <p className="text-slate-300 text-[11px]">{recipientDesig}</p>}
                    <p className="text-slate-400 text-[11px] font-mono">{recipientAddress || '[Address Placeholder]'}</p>
                  </div>
                </div>
              </div>

              {/* Card 4: Demands & Relief */}
              <div className="p-4 rounded-xl bg-[#0b0f24]/90 border border-slate-800 flex flex-col gap-2">
                <span className="text-[11px] font-mono text-emerald-400 uppercase font-semibold">Demands & Legal Remedy</span>
                <p className="text-slate-200 leading-relaxed mt-1">{actionRequired}</p>
                {legalProvisions && (
                  <p className="text-[11px] font-mono text-slate-400 mt-2">
                    Referenced Statute: <span className="text-cyan-300">{legalProvisions}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Facts Preview */}
            <div className="p-4 rounded-xl bg-[#07091a] border border-slate-800/90 text-xs">
              <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold block mb-2">
                Chronology of Facts (Input Data)
              </span>
              <p className="text-slate-300 leading-relaxed whitespace-pre-wrap font-mono text-[11px]">
                {whatHappened}
              </p>
            </div>

            {/* Disclaimer before generation */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
              <BookOpen className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-200 font-semibold mr-1">Pre-generation Notice:</span>
                <span>The AI will format this data into formal legal letterheads and numbered paragraphs. No facts or case laws will be invented. Any missing details will be rendered as bracketed placeholders.</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 font-mono flex items-center gap-2 cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Edit Form Details</span>
              </button>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 disabled:opacity-50 text-white text-xs font-semibold font-mono tracking-wide shadow-lg shadow-indigo-900/30 transition-all flex items-center gap-2 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    <span>Synthesizing Legal Draft...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-cyan-200" />
                    <span>Generate Legal Document</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 4: Generated Draft Editor & Export */}
        {/* ========================================================================= */}
        {currentStep === 4 && (
          <div className="flex flex-col gap-5">
            {/* Action Bar */}
            <div className="p-4 rounded-xl bg-[#0b0f24]/90 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-cyan-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span>{title}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 capitalize">
                      {activeDraft?.status || 'Generated'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {editorText.split(/\s+/).filter(Boolean).length} words · Editable Document Canvas
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 font-mono transition-colors cursor-pointer"
                  title="Modify structured form inputs"
                >
                  Edit Form Details
                </button>

                <button
                  type="button"
                  onClick={() => setShowRegenModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-500/30 text-xs font-mono text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Regenerate...</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveEditor}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-white transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{isSaving ? 'Saving...' : 'Save Edits'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyText}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 hover:text-white transition-colors cursor-pointer"
                >
                  {copiedState ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedState ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadTxt}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-xs font-semibold font-mono text-white shadow-md shadow-indigo-900/30 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download TXT</span>
                </button>
              </div>
            </div>

            {/* Document Editor Area */}
            <div className="bg-[#0b0f24]/95 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col min-h-[600px]">
              {/* Document Paper Header Bar */}
              <div className="p-3 border-b border-slate-800/80 bg-[#07091a] flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="flex items-center gap-2">
                  <PenTool className="w-3.5 h-3.5 text-cyan-400" />
                  <span>LEGAL DRAFT CANVAS (EDITABLE)</span>
                </span>
                <span className="text-[11px] text-slate-500">
                  Click inside to directly edit or customize clauses
                </span>
              </div>

              {/* Textarea mimicking formal legal paper */}
              <textarea
                value={editorText}
                onChange={(e) => setEditorText(e.target.value)}
                className="flex-1 w-full p-6 sm:p-8 bg-[#0a0d20] font-mono text-xs sm:text-sm text-slate-200 leading-relaxed outline-none resize-none focus:ring-0 select-text"
                rows={24}
                spellCheck={false}
              />
            </div>

            {/* Corroborating Statutory Sources (RAG) if any */}
            {activeDraft?.retrieved_sources && activeDraft.retrieved_sources.length > 0 && (
              <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 flex flex-col gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Corroborating Indian Statutory References (Retrieved RAG Sources)</span>
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                  {activeDraft.retrieved_sources.map((src, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-black/50 border border-cyan-500/20 text-xs">
                      <p className="font-semibold text-slate-200">{src.citation || src.title}</p>
                      <p className="text-slate-400 text-[11px] mt-1 font-mono line-clamp-3">{src.excerpt}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Legal Disclaimer */}
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
              <Scale className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-200 font-semibold mr-1">Statutory Notice:</span>
                <span>AI-generated draft for review. Verify all facts, legal references, and applicable requirements before sending or filing. This is not a substitute for advice from a qualified legal professional.</span>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Regenerate Draft */}
        {showRegenModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-[#0b0f24] border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 animate-scaleUp">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-cyan-400" />
                  <span>Regenerate Legal Draft</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowRegenModal(false)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Provide additional instructions to adjust tone, add specific clauses, or rephrase demands without losing your core facts.
              </p>

              <div>
                <label className="text-[11px] font-mono text-slate-300 block mb-1.5">
                  Adjustment Instructions (Optional)
                </label>
                <textarea
                  rows={3}
                  value={regenInstructions}
                  onChange={(e) => setRegenInstructions(e.target.value)}
                  placeholder="e.g. Make the deadline clause firmer and explicitly mention interest under Section 74..."
                  className="w-full p-3 rounded-xl bg-[#07091a] border border-slate-800 text-xs text-white placeholder-slate-600 outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegenModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={isRegenerating}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold font-mono flex items-center gap-2 cursor-pointer"
                >
                  {isRegenerating ? 'Regenerating...' : 'Regenerate Draft'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

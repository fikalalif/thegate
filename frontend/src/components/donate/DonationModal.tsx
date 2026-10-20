"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Heart,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Save,
  QrCode,
  CreditCard,
  Smartphone,
} from "lucide-react";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { useI18n } from "@/lib/i18n";
import {
  DonationConfig,
  getDonationConfig,
  saveDonationConfig,
} from "@/lib/donation";

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
}

export function DonationModal({ isOpen, onClose }: DonationModalProps) {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [config, setConfig] = useState<DonationConfig>(getDonationConfig());
  const [activeTab, setActiveTab] = useState<"saweria" | "paypal">("saweria");
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [isConfiguring, setIsConfiguring] = useState<boolean>(false);

  // Edit form state
  const [saweriaUrl, setSaweriaUrl] = useState(config.saweriaUrl);
  const [paypalUrl, setPaypalUrl] = useState(config.paypalUrl);
  const [paypalName, setPaypalName] = useState(config.paypalName);
  const [savedFeedback, setSavedFeedback] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    const handleUpdate = () => {
      const updated = getDonationConfig();
      setConfig(updated);
      setSaweriaUrl(updated.saweriaUrl);
      setPaypalUrl(updated.paypalUrl);
      setPaypalName(updated.paypalName);
    };

    window.addEventListener("donationconfigchange", handleUpdate);
    return () => window.removeEventListener("donationconfigchange", handleUpdate);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleCopy = (url: string, key: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedLink(key);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  const handleSaveHandles = (e: React.FormEvent) => {
    e.preventDefault();
    saveDonationConfig({
      saweriaUrl,
      paypalUrl,
      paypalName,
    });
    setSavedFeedback(true);
    setTimeout(() => {
      setSavedFeedback(false);
      setIsConfiguring(false);
    }, 1200);
  };

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-xs select-none"
    >
      <div className="relative w-full max-w-lg border-2 border-black bg-retro-night text-retro-cream shadow-pixel-lg max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 overflow-hidden">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between border-b-2 border-black bg-retro-plum px-3 sm:px-4 py-2 sm:py-3 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 pr-1">
            <div className="flex h-7 w-7 items-center justify-center border-2 border-black bg-pink-500 shadow-pixel-xs shrink-0">
              <Heart className="h-4 w-4 text-white fill-white animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h2 className="font-pixel text-[11px] sm:text-xs text-white tracking-wider truncate">
                  {t("donate.modal_title", "SUPPORT THEGATE")}
                </h2>
                <div className="hidden sm:inline-flex">
                  <PixelBadge variant="amber" size="xs">
                    {t("donate.badge_open_source", "OPEN-SOURCE")}
                  </PixelBadge>
                </div>
              </div>
              <p className="font-mono text-[9px] sm:text-[10px] text-retro-paper truncate mt-0.5">
                {t("donate.modal_subtitle", "Directly fund open-source development, GPU benchmarks, and community LLM routing research.")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center border-2 border-black bg-retro-coal text-retro-paper hover:bg-red-600 hover:text-white transition-none cursor-pointer shrink-0 ml-1"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 2-Column Responsive Category Tabs */}
        {!isConfiguring && (
          <div className="grid grid-cols-2 border-b-2 border-black bg-retro-coal shrink-0">
            {/* Tab 1: Saweria (Indonesia) */}
            <button
              onClick={() => setActiveTab("saweria")}
              className={`flex flex-col items-center justify-center py-2.5 px-2 border-r-2 border-black transition-none cursor-pointer text-center min-w-0 overflow-hidden ${
                activeTab === "saweria"
                  ? "bg-retro-amber text-black font-bold shadow-pixel-xs"
                  : "text-slate-300 hover:bg-retro-ink hover:text-white"
              }`}
            >
              <span className="font-pixel text-[10px] sm:text-xs truncate w-full">
                {t("donate.tab_saweria", "🇮🇩 SAWERIA")}
              </span>
              <span
                className={`font-mono text-[9px] sm:text-[10px] truncate w-full mt-0.5 ${
                  activeTab === "saweria" ? "text-neutral-900 font-bold" : "text-slate-400"
                }`}
              >
                {t("donate.tab_saweria_sub", "QRIS & E-Wallet")}
              </span>
            </button>

            {/* Tab 2: PayPal (International) */}
            <button
              onClick={() => setActiveTab("paypal")}
              className={`flex flex-col items-center justify-center py-2.5 px-2 transition-none cursor-pointer text-center min-w-0 overflow-hidden ${
                activeTab === "paypal"
                  ? "bg-retro-amber text-black font-bold shadow-pixel-xs"
                  : "text-slate-300 hover:bg-retro-ink hover:text-white"
              }`}
            >
              <span className="font-pixel text-[10px] sm:text-xs truncate w-full">
                {t("donate.tab_paypal", "🌍 PAYPAL")}
              </span>
              <span
                className={`font-mono text-[9px] sm:text-[10px] truncate w-full mt-0.5 ${
                  activeTab === "paypal" ? "text-neutral-900 font-bold" : "text-slate-400"
                }`}
              >
                {t("donate.tab_paypal_sub", "Card & Scan QR")}
              </span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-3 sm:p-5 overflow-y-auto space-y-3 font-mono text-xs flex-1">
          {isConfiguring ? (
            /* Configure Handles Form */
            <form onSubmit={handleSaveHandles} className="space-y-3">
              <div className="border border-retro-amber/40 bg-retro-amber/10 p-2.5 text-slate-300">
                <span className="font-pixel text-[10px] text-retro-amber block">
                  ⚙️ CONFIGURE DONATION DESTINATIONS
                </span>
                <p className="text-[10px] sm:text-[11px] text-retro-paper mt-0.5 leading-relaxed">
                  Update your Saweria or PayPal donation addresses. Settings are stored in your local browser storage.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] sm:text-[11px] text-retro-paper font-bold block">
                  🇮🇩 Saweria URL:
                </label>
                <input
                  type="url"
                  value={saweriaUrl}
                  onChange={(e) => setSaweriaUrl(e.target.value)}
                  className="w-full border-2 border-black bg-retro-coal text-retro-cream px-2.5 py-1.5 font-mono text-xs focus:border-retro-amber focus:outline-none"
                  placeholder="https://saweria.co/yourhandle"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] sm:text-[11px] text-retro-paper font-bold block">
                  🌍 PayPal Payment / QR URL:
                </label>
                <input
                  type="url"
                  value={paypalUrl}
                  onChange={(e) => setPaypalUrl(e.target.value)}
                  className="w-full border-2 border-black bg-retro-coal text-retro-cream px-2.5 py-1.5 font-mono text-xs focus:border-retro-amber focus:outline-none"
                  placeholder="https://www.paypal.com/qrcodes/p2pqrc/..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] sm:text-[11px] text-retro-paper font-bold block">
                  🌍 PayPal Account Name:
                </label>
                <input
                  type="text"
                  value={paypalName}
                  onChange={(e) => setPaypalName(e.target.value)}
                  className="w-full border-2 border-black bg-retro-coal text-retro-cream px-2.5 py-1.5 font-mono text-xs focus:border-retro-amber focus:outline-none"
                  placeholder="fikal alif"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-retro-ink gap-2">
                <button
                  type="button"
                  onClick={() => setIsConfiguring(false)}
                  className="w-1/2 sm:w-auto px-3 py-1.5 font-pixel text-[10px] border-2 border-black bg-retro-coal text-retro-paper hover:text-white transition-none cursor-pointer text-center"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="w-1/2 sm:w-auto flex items-center justify-center gap-1.5 px-3 py-1.5 font-pixel text-[10px] border-2 border-black bg-retro-amber text-black font-bold hover:bg-amber-400 transition-none cursor-pointer shadow-pixel-xs"
                >
                  {savedFeedback ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>SAVED!</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      <span>SAVE CONFIG</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* TAB 1: SAWERIA (INDONESIA & QRIS) */}
              {activeTab === "saweria" && (
                <div className="space-y-3">
                  <div className="border-2 border-black bg-retro-coal p-3.5 sm:p-4 space-y-3 shadow-pixel-sm">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2 border-b border-retro-ink/60 pb-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-9 w-9 items-center justify-center border-2 border-black bg-amber-500 font-pixel text-black text-sm font-bold shadow-pixel-xs shrink-0">
                          SA
                        </div>
                        <div className="min-w-0">
                          <div className="font-pixel text-xs text-retro-cream">
                            {t("donate.saweria_title", "Saweria")}
                          </div>
                          <span className="inline-block text-[9px] font-mono text-retro-amber font-bold">
                            QRIS, GOPAY, OVO & DANA
                          </span>
                        </div>
                      </div>
                      <PixelBadge variant="amber" size="xs">
                        {t("donate.saweria_badge", "INDONESIA")}
                      </PixelBadge>
                    </div>

                    {/* Description */}
                    <p className="text-[10px] sm:text-[11px] text-slate-300 leading-relaxed">
                      {t("donate.saweria_desc", "Instant QRIS payment from all Indonesian bank apps & digital wallets.")}
                    </p>

                    {/* URL Card with Direct Copy */}
                    <div className="border-2 border-black bg-retro-night p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[9px] text-retro-paper">
                        <span className="font-pixel">DIRECT SAWERIA LINK:</span>
                        <span className="text-retro-mint">Zero Signup for Donors</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 bg-black/60 p-2 border border-retro-ink font-mono text-[10px] sm:text-[11px] text-retro-cream">
                        <span className="truncate select-all text-retro-amber">
                          {config.saweriaUrl}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(config.saweriaUrl, "saweria")}
                          className="flex items-center gap-1 border border-black bg-retro-coal hover:bg-retro-ink text-retro-paper hover:text-white px-2 py-0.5 text-[9px] font-pixel shrink-0 cursor-pointer"
                          title="Copy Saweria link"
                        >
                          {copiedLink === "saweria" ? (
                            <>
                              <Check className="h-3 w-3 text-retro-mint" />
                              <span className="text-retro-mint">COPIED</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>COPY</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Primary Action Button */}
                    <div className="pt-1">
                      <a
                        href={config.saweriaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 border-2 border-black bg-amber-500 hover:bg-amber-400 text-black font-bold py-2.5 px-3 font-pixel text-xs shadow-pixel-xs transition-none cursor-pointer"
                      >
                        <Smartphone className="h-4 w-4" />
                        <span>{t("donate.saweria_action", "SUPPORT VIA SAWERIA")}</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>

                    {/* Supported Methods Footer */}
                    <div className="border-t border-retro-ink/50 pt-2 text-[10px] text-slate-400 flex items-center gap-1.5">
                      <QrCode className="h-3.5 w-3.5 text-retro-amber shrink-0" />
                      <span className="truncate">
                        {t("donate.saweria_supported", "Supported: QRIS (BCA, Mandiri, BRI, BNI), GoPay, OVO, DANA, ShopeePay & LinkAja")}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PAYPAL (GLOBAL & QR SCAN) */}
              {activeTab === "paypal" && (
                <div className="space-y-3">
                  <div className="border-2 border-black bg-retro-coal p-3.5 sm:p-4 space-y-3 shadow-pixel-sm">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2 border-b border-retro-ink/60 pb-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-9 w-9 items-center justify-center border-2 border-black bg-blue-600 font-pixel text-white text-sm font-bold shadow-pixel-xs shrink-0">
                          PP
                        </div>
                        <div className="min-w-0">
                          <div className="font-pixel text-xs text-retro-cream">
                            {t("donate.paypal_title", "PayPal")}
                          </div>
                          <span className="inline-block text-[9px] font-mono text-blue-400 font-bold">
                            CARD, PAYPAL & SCAN QR
                          </span>
                        </div>
                      </div>
                      <PixelBadge variant="cyan" size="xs">
                        {t("donate.paypal_badge", "GLOBAL")}
                      </PixelBadge>
                    </div>

                    {/* Recipient details */}
                    <div className="flex items-center justify-between bg-black/40 border border-retro-ink px-2.5 py-1.5 text-[10px]">
                      <span className="text-slate-400 font-pixel text-[9px]">
                        {t("donate.paypal_recipient", "Account Recipient")}:
                      </span>
                      <span className="font-mono text-retro-mint font-bold text-[11px]">
                        {config.paypalName || "fikal alif"}
                      </span>
                    </div>

                    {/* Centered Official PayPal QR Code */}
                    <div className="border-2 border-black bg-retro-night p-3 text-center space-y-2">
                      <span className="font-pixel text-[9px] text-retro-paper block">
                        PAYPAL OFFICIAL QR CODE:
                      </span>
                      <div className="inline-block bg-white p-2 border-2 border-black shadow-pixel-xs rounded">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={config.paypalQrImage || "/paypal_qr.png"}
                          alt="PayPal QR Code"
                          className="w-36 h-auto sm:w-44 max-w-full block mx-auto"
                        />
                      </div>
                      <p className="text-[10px] text-slate-300 max-w-xs mx-auto leading-tight">
                        {t("donate.paypal_scan_tip", "Scan with PayPal Mobile App or click the link to pay via browser.")}
                      </p>
                    </div>

                    {/* Action Buttons: Direct Pay & Copy Link */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <a
                        href={config.paypalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 border-2 border-black bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-3 font-pixel text-[10px] sm:text-[11px] shadow-pixel-xs transition-none cursor-pointer"
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        <span>{t("donate.paypal_action", "PAY VIA PAYPAL")}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>

                      <button
                        type="button"
                        onClick={() => handleCopy(config.paypalUrl, "paypal")}
                        className={`flex items-center justify-center gap-1.5 border-2 border-black py-2 px-3 font-pixel text-[10px] sm:text-[11px] shadow-pixel-xs transition-none cursor-pointer ${
                          copiedLink === "paypal"
                            ? "bg-retro-mint text-black font-bold"
                            : "bg-retro-coal hover:bg-retro-ink text-retro-paper hover:text-white"
                        }`}
                      >
                        {copiedLink === "paypal" ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>{t("donate.copied", "COPIED!")}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>{t("donate.copy_link", "COPY LINK")}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer Banner */}
              <div className="border border-retro-ink bg-retro-plum/40 p-2 sm:p-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-2">
                <div className="flex items-start gap-1.5 min-w-0">
                  <ShieldCheck className="h-3.5 w-3.5 text-retro-mint shrink-0 mt-0.5" />
                  <p className="text-[9px] sm:text-[10px] text-retro-paper leading-tight break-words">
                    {t("donate.footer_note", "Directly funds GPU benchmarks and open-source routing research.")}
                  </p>
                </div>
                <button
                  onClick={() => setIsConfiguring(true)}
                  className="font-pixel text-[9px] text-retro-amber hover:underline cursor-pointer shrink-0 self-start sm:self-auto ml-5 sm:ml-0"
                >
                  {t("donate.configure", "⚙️ Configure Handles")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

import React from "react";
import { Shield, KeyRound, ArrowRight, Chrome, Mail, AlertTriangle, Copy, Check, ExternalLink, Globe } from "lucide-react";
import { signInWithPopup, signInAnonymously } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { deriveEncryptionKey, encryptText, decryptText } from "../crypto";

interface AuthScreenProps {
  onAuthenticated: (user: any, cryptoKey: CryptoKey, phrase: string) => void;
  darkMode: boolean;
}

export default function AuthScreen({ onAuthenticated, darkMode }: AuthScreenProps) {
  const [phase, setPhase] = React.useState<'auth' | 'vault-setup' | 'vault-unlock'>('auth');
  const [user, setUser] = React.useState<any>(null);
  const [passphrase, setPassphrase] = React.useState('');
  const [confirmPassphrase, setConfirmPassphrase] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState('');
  const [unauthorizedDomain, setUnauthorizedDomain] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [showIframeWarning, setShowIframeWarning] = React.useState(false);
  const [copiedDomain, setCopiedDomain] = React.useState(false);

  React.useEffect(() => {
    // Detect if we are in an iframe (which often blocks Firebase OAuth popup)
    if (window.self !== window.top) {
      setShowIframeWarning(true);
    }
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage('');
    setUnauthorizedDomain(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      handleUserAuthenticated(result.user);
    } catch (err: any) {
      console.error("Popup signin error", err);
      if (err.code === "auth/unauthorized-domain") {
        const currentHost = window.location.hostname || "current domain";
        setUnauthorizedDomain(currentHost);
        setErrorMessage(
          `Domain "${currentHost}" is not yet authorized in your Firebase Authentication console.`
        );
      } else if (err.code === "auth/popup-blocked" || err.code === "auth/internal-error" || err.code === "auth/network-request-failed") {
        setErrorMessage("OAuth popup was blocked or restricted by the browser sandbox. You can use Anonymous/Offline Session below.");
      } else {
        setErrorMessage(err.message || "Failed to sign in with Google.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const result = await signInAnonymously(auth);
      handleUserAuthenticated(result.user);
    } catch (err: any) {
      if (err.code === 'auth/admin-restricted-operation') {
        console.warn("Firebase Anonymous Sign-In is restricted/disabled on this Firebase project. Gracefully falling back to fully secure local offline guest mode.", err);
      } else {
        console.warn("Anonymous auth failed, falling back to secure offline local mode.", err);
      }
      // fallback to pure local mode
      const localGuestUser = {
        uid: "guest-offline-user",
        email: "guest@harmony.local",
        displayName: "Guest User",
        photoURL: null,
      };
      handleUserAuthenticated(localGuestUser);
    } finally {
      setLoading(false);
    }
  };

  const handleUserAuthenticated = (firebaseUser: any) => {
    setUser(firebaseUser);
    
    // Check if user has an active vault configuration in this browser's local storage
    const vaultValidation = localStorage.getItem(`harmony_vault_check_${firebaseUser.uid}`);
    if (vaultValidation) {
      setPhase('vault-unlock');
    } else {
      setPhase('vault-setup');
    }
  };

  const handleSetupVault = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (passphrase.length < 6) {
      setErrorMessage("Security Phrase must be at least 6 characters long.");
      return;
    }

    if (passphrase !== confirmPassphrase) {
      setErrorMessage("Passphrases do not match.");
      return;
    }

    setLoading(true);
    try {
      const key = await deriveEncryptionKey(passphrase);
      
      // Cryptographically secure validation anchor
      // We encrypt a static phrase. If we can decrypt it later, we verify the user entered the correct password!
      const verificationAnchor = "harmony-vault-is-authorized";
      const encryptedAnchor = await encryptText(verificationAnchor, key);
      
      localStorage.setItem(`harmony_vault_check_${user.uid}`, JSON.stringify(encryptedAnchor));
      localStorage.setItem(`harmony_vault_hint_${user.uid}`, passphrase.substring(0, 2) + "... " + passphrase.substring(passphrase.length - 1));

      onAuthenticated(user, key, passphrase);
    } catch (err) {
      setErrorMessage("Failed to generate secure encryption vault.");
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockVault = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);
    try {
      const key = await deriveEncryptionKey(passphrase);
      
      // Decrypt the verification anchor
      const anchorDataRaw = localStorage.getItem(`harmony_vault_check_${user.uid}`);
      if (!anchorDataRaw) {
        setErrorMessage("Vault validation anchor missing. Reset vault in Settings if lost.");
        setLoading(false);
        return;
      }

      const anchorData = JSON.parse(anchorDataRaw);
      const decrypted = await decryptText(anchorData.encrypted, anchorData.iv, key);
      
      if (decrypted === "harmony-vault-is-authorized") {
        onAuthenticated(user, key, passphrase);
      } else {
        setErrorMessage("Invalid Security Phrase. Verification failed.");
      }
    } catch (err) {
      setErrorMessage("Invalid Security Phrase. Decryption failed.");
    } finally {
      setLoading(false);
    }
  };

  const vaultHint = user ? localStorage.getItem(`harmony_vault_hint_${user.uid}`) : "";

  return (
    <div className={`min-h-[85vh] flex flex-col justify-center items-center px-4 transition-colors ${
      darkMode ? "text-white" : "text-stone-900"
    }`}>
      {phase === 'auth' && (
        <div className={`w-full max-w-sm p-8 rounded-3xl border shadow-2xl flex flex-col items-center ${
          darkMode ? "bg-[#1C1C1E]/60 border-[#38383A] backdrop-blur-xl" : "bg-white border-stone-200"
        }`}>
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#0A84FF] to-[#5E5CE6] flex items-center justify-center mb-6 shadow-xl shadow-[#0A84FF]/20">
            <Shield className="w-8 h-8 text-white" />
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-center mb-2">Harmony Notes</h2>
          <p className={`${darkMode ? "text-[#8E8E93]" : "text-stone-500"} text-xs text-center mb-8 px-2 leading-relaxed`}>
            Personal Notes, Routines, and Self-Challenges secured with End-to-End Cryptography and zero-knowledge servers.
          </p>

          {showIframeWarning && (
            <div className={`mb-6 p-3 rounded-2xl flex gap-2.5 items-start text-xs border ${
              darkMode ? "bg-amber-950/20 border-amber-900/40 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-800"
            }`}>
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Running inside a secure frame. Popups may be restricted. If Google Login blocks, select <strong>Anonymous Guest Session</strong>.
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="w-full mb-4 p-3 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 text-xs font-semibold leading-relaxed">
              <p>{errorMessage}</p>
              
              {unauthorizedDomain && (
                <div className={`mt-3 p-3 rounded-xl border text-[11px] font-normal space-y-2.5 ${
                  darkMode ? "bg-black/40 border-rose-500/30 text-stone-200" : "bg-white/80 border-rose-200 text-stone-700"
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[10px] uppercase tracking-wider text-[#0A84FF] flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      Domain to Whitelist
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(unauthorizedDomain);
                        setCopiedDomain(true);
                        setTimeout(() => setCopiedDomain(false), 2000);
                      }}
                      className="px-2 py-0.5 rounded-md bg-[#0A84FF]/15 hover:bg-[#0A84FF]/25 text-[#0A84FF] text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                    >
                      {copiedDomain ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedDomain ? "Copied!" : "Copy Domain"}</span>
                    </button>
                  </div>

                  <code className="block p-1.5 rounded-lg bg-black/20 font-mono text-[10px] text-[#0A84FF] select-all break-all">
                    {unauthorizedDomain}
                  </code>

                  <ol className="list-decimal pl-4 space-y-1 text-[10px] leading-snug opacity-90">
                    <li>Open <strong>Firebase Console</strong> &gt; <strong>Authentication</strong>.</li>
                    <li>Go to the <strong>Settings</strong> tab &gt; <strong>Authorized domains</strong>.</li>
                    <li>Click <strong>Add domain</strong> and paste the domain above.</li>
                  </ol>

                  <div className="pt-1 border-t border-rose-500/20">
                    <button
                      type="button"
                      onClick={handleAnonymousSignIn}
                      className="w-full py-1.5 px-2.5 bg-[#0A84FF] hover:bg-[#409CFF] text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer"
                    >
                      <span>Continue via Secure Local Vault Mode</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="w-full flex flex-col gap-3">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className={`w-full py-3 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 border transition-all ${
                darkMode 
                  ? "bg-[#1C1C1E] hover:bg-[#323234]/50 border-[#38383A] text-stone-200" 
                  : "bg-white hover:bg-stone-50 border-stone-200 text-stone-700 shadow-sm"
              }`}
            >
              <Chrome className="w-4 h-4 text-[#0A84FF]" />
              {loading ? "Connecting..." : "Sign in with Google"}
            </button>

            <button
              onClick={handleAnonymousSignIn}
              disabled={loading}
              className={`w-full py-3 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all ${
                darkMode 
                  ? "bg-[#0A84FF] hover:bg-[#409CFF] text-white shadow-lg shadow-[#0A84FF]/20" 
                  : "bg-[#0A84FF] hover:bg-[#409CFF] text-white shadow-lg shadow-[#0A84FF]/20"
              }`}
            >
              <Mail className="w-4 h-4" />
              Anonymous Guest Session
            </button>
          </div>
        </div>
      )}

      {phase === 'vault-setup' && (
        <div className={`w-full max-w-sm p-8 rounded-3xl border shadow-2xl ${
          darkMode ? "bg-[#1C1C1E]/60 border-[#38383A] backdrop-blur-xl" : "bg-white border-stone-200"
        }`}>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0A84FF] to-[#5E5CE6] text-white flex items-center justify-center mb-5 shadow-lg shadow-[#0A84FF]/10">
            <KeyRound className="w-6 h-6" />
          </div>

          <h2 className="text-xl font-bold mb-1">Initialize Vault</h2>
          <p className={`text-xs ${darkMode ? "text-[#8E8E93]" : "text-stone-500"} mb-6 leading-relaxed`}>
            Create a local master Security Phrase. This phrase is used to derive your private AES key on this device. 
            <span className="text-[#0A84FF] font-semibold block mt-1">Never lost—this is never uploaded to the database.</span>
          </p>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 text-xs">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSetupVault} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 opacity-60">Security Phrase</label>
              <input
                type="password"
                required
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Must be at least 6 characters"
                className={`w-full p-3 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-[#0A84FF] ${
                  darkMode ? "bg-black/40 border-[#38383A] text-white" : "bg-stone-50 border-stone-200"
                }`}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 opacity-60">Confirm Phrase</label>
              <input
                type="password"
                required
                value={confirmPassphrase}
                onChange={(e) => setConfirmPassphrase(e.target.value)}
                placeholder="Re-enter Security Phrase"
                className={`w-full p-3 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-[#0A84FF] ${
                  darkMode ? "bg-black/40 border-[#38383A] text-white" : "bg-stone-50 border-stone-200"
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#0A84FF] hover:bg-[#409CFF] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#0A84FF]/20"
            >
              {loading ? "Generating Secure Keys..." : "Activate Private Vault"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {phase === 'vault-unlock' && (
        <div className={`w-full max-w-sm p-8 rounded-3xl border shadow-2xl ${
          darkMode ? "bg-[#1C1C1E]/60 border-[#38383A] backdrop-blur-xl" : "bg-white border-stone-200"
        }`}>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0A84FF] to-[#5E5CE6] text-white flex items-center justify-center mb-5 shadow-lg shadow-[#0A84FF]/10">
            <Shield className="w-6 h-6" />
          </div>

          <h2 className="text-xl font-bold mb-1">Unlock Secure Vault</h2>
          <p className={`text-xs ${darkMode ? "text-[#8E8E93]" : "text-stone-500"} mb-6 leading-relaxed`}>
            Welcome back! Enter your private Security Phrase to decrypt and download your personal hub locally.
          </p>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 text-xs">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleUnlockVault} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Security Phrase</label>
                {vaultHint && (
                  <span className="text-[9px] opacity-40">Hint: {vaultHint}</span>
                )}
              </div>
              <input
                type="password"
                required
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Enter your security phrase"
                className={`w-full p-3 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-[#0A84FF] ${
                  darkMode ? "bg-black/40 border-[#38383A] text-white" : "bg-stone-50 border-stone-200"
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#0A84FF] hover:bg-[#409CFF] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#0A84FF]/20"
            >
              {loading ? "Unlocking Vault..." : "Access Secured Data"}
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (confirm("WARNING: Clearing keys will remove your access to encrypted notes locally on this browser. You must remember your original phrase to decrypt remote data! Reset?")) {
                  localStorage.removeItem(`harmony_vault_check_${user.uid}`);
                  localStorage.removeItem(`harmony_vault_hint_${user.uid}`);
                  setPhase('vault-setup');
                }
              }}
              className="w-full text-center text-[10px] text-stone-400 hover:text-stone-500 underline block pt-2"
            >
              Reset local validation checks
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

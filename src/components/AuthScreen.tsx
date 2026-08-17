import { useState } from "react";
import { ArrowLeft, ArrowRight, Home, KeyRound, PlusCircle, Sparkles, Users } from "lucide-react";
import { BRAND } from "../lib/brand";
import { Btn, Card, Field, inputCls } from "./ui";
import { cn } from "../utils/cn";

export default function AuthScreen({
  initialCode,
  currentHomeName,
  onCancel,
  onCreate,
  onJoin,
}: {
  initialCode?: string | null;
  currentHomeName?: string;
  onCancel?: () => void;
  onCreate: (flatName: string, adminName: string, phone: string) => Promise<void>;
  onJoin: (joinCode: string, name: string, phone: string) => Promise<string | null>;
}) {
  const [mode, setMode] = useState<"join" | "create">(
    initialCode ? "join" : "create",
  );
  const [flatName, setFlatName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminPhone, setAdminPhone] = useState("");

  const [joinCode, setJoinCode] = useState(initialCode ?? "");
  const [memberName, setMemberName] = useState("");
  const [memberPhone, setMemberPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flatName.trim() || !adminName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onCreate(flatName.trim(), adminName.trim(), adminPhone.trim() || "—");
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || !memberName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const err = await onJoin(
        joinCode.trim(),
        memberName.trim(),
        memberPhone.trim() || "—",
      );
      if (err) {
        setError(err);
        setLoading(false);
      }
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-6 text-ink">
      <div className="cm-in w-full max-w-lg space-y-6">
        {/* Back to Active Home button if user just navigated here */}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-2 text-xs font-semibold text-accent hover:underline"
          >
            <ArrowLeft size={14} /> Back to {currentHomeName || "My Home"}
          </button>
        )}
        {/* brand hero */}
        <div className="text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-gradient-to-br from-emerald-500/20 to-sky-500/20 text-2xl font-extrabold shadow-lg">
            {BRAND.short}
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight">
            {BRAND.name}
          </h1>
          <p className="mt-1 text-xs text-muted leading-relaxed">
            {BRAND.tagline} — shared task rotation for every household
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-line bg-panel2 p-1.5">
          <button
            type="button"
            onClick={() => {
              setMode("create");
              setError(null);
            }}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition-all",
              mode === "create"
                ? "border border-line bg-panel text-ink shadow-sm"
                : "text-muted hover:text-ink",
            )}
          >
            <PlusCircle size={15} className={mode === "create" ? "text-accent" : ""} />
            Create a New Home
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("join");
              setError(null);
            }}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition-all",
              mode === "join"
                ? "border border-line bg-panel text-ink shadow-sm"
                : "text-muted hover:text-ink",
            )}
          >
            <KeyRound size={15} className={mode === "join" ? "text-accent" : ""} />
            Join an Existing Home
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center text-xs font-semibold text-red-400">
            ⚠️ {error}
          </div>
        )}

        {/* Mode A: Create New Home (Admin) */}
        {mode === "create" && (
          <Card className="p-6">
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="flex items-center gap-2 border-b border-line pb-3">
                <Home size={18} className="text-accent" />
                <div>
                  <h2 className="text-base font-extrabold">Create Your Home</h2>
                  <p className="text-[11px] text-muted">
                    Set up a new household and become the Admin
                  </p>
                </div>
              </div>

              <Field label="House / Flat Name">
                <input
                  required
                  autoFocus
                  className={inputCls}
                  value={flatName}
                  onChange={(e) => setFlatName(e.target.value)}
                  placeholder="e.g. Skyline Apartments #302"
                />
              </Field>

              <Field label="Your Name (Admin)">
                <input
                  required
                  className={inputCls}
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="e.g. Selva Kailash"
                />
              </Field>

              <Field label="Your Phone Number">
                <input
                  className={inputCls}
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  placeholder="+91 93605 71671"
                />
              </Field>

              <p className="flex items-center gap-2 text-[11px] text-muted">
                <Sparkles size={13} className="text-amber-400 shrink-0" />
                You will get a unique Join Code (e.g. FLAT-8K9P-402) to invite your roommates.
              </p>

              <Btn
                type="submit"
                variant="solid"
                disabled={loading || !flatName.trim() || !adminName.trim()}
                className="w-full py-3 text-sm"
              >
                {loading ? "Creating Home..." : "Create Home & Become Admin"}
                <ArrowRight size={15} />
              </Btn>
            </form>
          </Card>
        )}

        {/* Mode B: Join Existing Home (Member) */}
        {mode === "join" && (
          <Card className="p-6">
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="flex items-center gap-2 border-b border-line pb-3">
                <Users size={18} className="text-accent" />
                <div>
                  <h2 className="text-base font-extrabold">Join Your Home</h2>
                  <p className="text-[11px] text-muted">
                    Enter the Join Code provided by your housemate
                  </p>
                </div>
              </div>

              <Field label="Join Code">
                <input
                  required
                  autoFocus={!initialCode}
                  className={cn(inputCls, "font-mono uppercase tracking-wider text-accent font-bold")}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="FLAT-XXXX-402"
                />
              </Field>

              <Field label="Your Full Name">
                <input
                  required
                  autoFocus={!!initialCode}
                  className={inputCls}
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                />
              </Field>

              <Field label="Your Phone Number">
                <input
                  className={inputCls}
                  value={memberPhone}
                  onChange={(e) => setMemberPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </Field>

              <Btn
                type="submit"
                variant="solid"
                disabled={loading || !joinCode.trim() || !memberName.trim()}
                className="w-full py-3 text-sm"
              >
                {loading ? "Joining Home..." : "Join Rotation"}
                <ArrowRight size={15} />
              </Btn>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}

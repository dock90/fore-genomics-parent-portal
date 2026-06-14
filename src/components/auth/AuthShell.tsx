"use client";

import type { ReactNode } from "react";
import { DnaHelix } from "./DnaHelix";
import { Check } from "./icons";
import { EarlyDetectionArt, MedicationArt, CounselingArt, HelixVert } from "./illustrations";

const FEATURES = [
  { art: EarlyDetectionArt, title: "Early detection", copy: "Whole-genome screening flags risks early" },
  { art: MedicationArt, title: "Medication insights", copy: "Guidance tailored to your child’s genes" },
  { art: CounselingArt, title: "Genetic counseling", copy: "Board-certified counselors on call" },
];

const BADGES = ["HIPAA-compliant", "CLIA / CAP", "HSA / FSA"];

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="fg-auth">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="fg-decor" aria-hidden="true">
        <span className="fg-circle c1" />
        <span className="fg-circle c2" />
        <div className="fg-helix-wrap">
          <DnaHelix className="fg-helix" />
        </div>
      </div>

      <main className="fg-shell">
        <div className="fg-stack fg-rise">
          <div className="fg-card">
            <div className="fg-badge" aria-hidden="true">
              <HelixVert size={34} />
            </div>

            <div className="fg-card-inner">
              <section className="fg-brand">
                <img
                  className="fg-wordmark"
                  src="/images/logos/fore-genomics-logo-green.svg"
                  alt="Fore Genomics"
                />
                <p className="fg-script">Know more. Know early.</p>
                <h1 className="fg-h1">
                  A more personalized approach to your child&apos;s health.{" "}
                  <span className="fg-em">Powered by DNA.</span>
                </h1>
                <div className="fg-badges">
                  {BADGES.map((b) => (
                    <span className="fg-trust" key={b}>
                      <Check size={13} strokeWidth={2} />
                      {b}
                    </span>
                  ))}
                </div>
              </section>

              <section className="fg-formpanel">
                <img
                  className="fg-wordmark-m"
                  src="/images/logos/fore-genomics-logo-green.svg"
                  alt="Fore Genomics"
                />
                {children}
              </section>
            </div>
          </div>

          <ul className="fg-featrow">
            {FEATURES.map((f, i) => {
              const Art = f.art;
              return (
                <li className="fg-feattile" key={i}>
                  <span className="art">
                    <Art size={52} />
                  </span>
                  <span className="txt">
                    <b>{f.title}</b>
                    <span>{f.copy}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </main>

      <footer className="fg-footer">
        © {new Date().getFullYear()} Fore Genomics · All rights reserved
      </footer>
    </div>
  );
}

export default AuthShell;

const CSS = `
.fg-auth{position:relative;left:50%;width:100vw;margin-left:-50vw;min-height:100vh;overflow:hidden;
 --sage:#5e9e8f;--sage-d:#50917f;--teal:#68b3a9;--teal-l:#98cbc4;
 --ink:#21302d;--ink-soft:#3c4b48;--muted:#5e6d6a;--line:#e1ece7;
 font-family:var(--font-grotesk,system-ui,sans-serif);color:var(--ink);
 background:linear-gradient(165deg,#f4faf7 0%,#eaf4ef 52%,#dcebe4 100%);-webkit-font-smoothing:antialiased;}

.fg-decor{position:absolute;inset:0;overflow:hidden;z-index:0;pointer-events:none;}
.fg-circle{position:absolute;border-radius:50%;}
.fg-circle.c1{width:560px;height:560px;right:-150px;top:-120px;background:radial-gradient(circle at 35% 35%,rgba(111,177,161,.3),rgba(111,177,161,0) 68%);}
.fg-circle.c2{width:480px;height:480px;left:-150px;bottom:-170px;background:radial-gradient(circle at 60% 40%,rgba(152,203,196,.32),rgba(152,203,196,0) 70%);}
.fg-helix-wrap{position:absolute;top:46%;right:-40px;transform:translateY(-50%) rotate(34deg);height:150vh;opacity:.14;}
.fg-helix-wrap svg{height:100%;width:auto;display:block;}
.fg-helix-flow{animation:fg-flow 60s linear infinite;}

@keyframes fg-flow{from{transform:translate(0,0)}to{transform:translate(0,-720px)}}
@keyframes fg-node{0%,100%{opacity:.45}50%{opacity:.9}}
@keyframes fg-rise{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes fg-spin{to{transform:rotate(360deg)}}
.fg-node{animation:fg-node 5s ease-in-out infinite;}

.fg-shell{position:relative;z-index:3;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:84px 24px 72px;box-sizing:border-box;}
.fg-stack{display:flex;flex-direction:column;gap:20px;width:100%;max-width:1024px;}
.fg-rise{opacity:0;animation:fg-rise .7s cubic-bezier(.22,.61,.36,1) .05s forwards;}
.fg-card{position:relative;width:100%;}
.fg-card-inner{position:relative;display:grid;grid-template-columns:1.04fr .96fr;border-radius:30px;overflow:hidden;
 background:#fff;border:1px solid rgba(94,158,143,.16);
 box-shadow:0 34px 80px -34px rgba(35,75,67,.42),0 6px 20px -12px rgba(35,75,67,.2);}

.fg-badge{position:absolute;top:-26px;right:46px;z-index:6;width:62px;height:62px;border-radius:19px;display:flex;align-items:center;justify-content:center;
 color:#fff;background:linear-gradient(150deg,var(--teal),var(--sage));
 box-shadow:0 14px 26px -10px rgba(80,145,127,.7),inset 0 1px 0 rgba(255,255,255,.35);}

.fg-brand{position:relative;padding:54px 46px;background:linear-gradient(168deg,#eef6f2 0%,#e1efe8 100%);display:flex;flex-direction:column;}
.fg-brand::after{content:"";position:absolute;top:16%;right:-1px;width:1px;height:68%;background:linear-gradient(rgba(94,158,143,0),rgba(94,158,143,.22),rgba(94,158,143,0));}
.fg-wordmark{height:26px;width:auto;align-self:flex-start;}
.fg-script{font-family:var(--font-accent,cursive);color:var(--sage);font-weight:700;font-size:32px;line-height:1;margin:26px 0 12px;}
.fg-h1{font-family:var(--font-display,system-ui,sans-serif);font-weight:400;font-size:35px;line-height:1.16;letter-spacing:-.01em;color:var(--ink);margin:0;}
.fg-em{color:var(--sage);font-weight:500;}
.fg-badges{display:flex;align-items:center;gap:18px;margin-top:auto;padding-top:34px;flex-wrap:nowrap;}
.fg-trust{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:500;color:var(--sage-d);white-space:nowrap;}
.fg-trust svg{color:var(--sage);flex:none;}

.fg-formpanel{position:relative;padding:52px 48px;background:#fff;display:flex;flex-direction:column;justify-content:center;}
.fg-wordmark-m{display:none;height:24px;width:auto;margin:0 auto 26px;}

.fg-featrow{list-style:none;margin:0;padding:4px 6px 0;display:grid;grid-template-columns:repeat(3,1fr);gap:0;}
.fg-feattile{position:relative;display:flex;align-items:center;gap:14px;padding:8px 22px;}
.fg-feattile + .fg-feattile::before{content:"";position:absolute;left:0;top:50%;transform:translateY(-50%);width:1px;height:42px;background:rgba(94,158,143,.24);}
.fg-feattile .art{flex:none;line-height:0;}
.fg-feattile .txt{display:flex;flex-direction:column;}
.fg-feattile b{font-size:14px;font-weight:600;color:var(--ink);}
.fg-feattile .txt span{font-size:12.5px;line-height:1.4;color:var(--muted);margin-top:2px;}

.fg-title{font-family:var(--font-display,system-ui,sans-serif);font-weight:500;font-size:33px;line-height:1.12;letter-spacing:-.015em;color:var(--ink);margin:0;}
.fg-subtitle{margin:14px 0 0;font-size:15px;line-height:1.55;color:var(--muted);}
.fg-subtitle b{color:var(--ink);font-weight:600;}

.fg-form{display:flex;flex-direction:column;gap:17px;margin-top:30px;}
.fg-group{display:flex;flex-direction:column;}
.fg-rowlabel{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}
.fg-label{font-size:12px;font-weight:600;letter-spacing:.02em;color:var(--ink-soft);margin-bottom:8px;}
.fg-rowlabel .fg-label{margin-bottom:0;}
.fg-field{position:relative;}
.fg-ficon{position:absolute;left:15px;top:50%;transform:translateY(-50%);color:var(--sage);display:flex;pointer-events:none;}
.fg-input{width:100%;height:52px;box-sizing:border-box;border-radius:13px;border:1px solid var(--line);
 background:#f6faf8;color:var(--ink);font-family:var(--font-grotesk);font-size:15px;
 padding:0 16px 0 44px;transition:border-color .16s,box-shadow .16s,background .16s;}
.fg-input::placeholder{color:#9aa9a5;}
.fg-input:focus,.fg-input:focus-visible{outline:none;border-color:var(--sage);background:#fff;box-shadow:0 0 0 4px rgba(94,158,143,.14);}
.fg-input.pw{padding-right:46px;}
.fg-input.otp{text-align:center;letter-spacing:.5em;font-size:20px;font-weight:600;padding:0 8px 0 22px;}
.fg-eye{position:absolute;right:9px;top:50%;transform:translateY(-50%);display:flex;align-items:center;justify-content:center;width:34px;height:34px;border:none;background:none;color:#8b9a96;cursor:pointer;border-radius:9px;transition:color .15s,background .15s;}
.fg-eye:hover{color:var(--ink);background:#eef4f1;}
.fg-forgot{font-size:12.5px;font-weight:500;color:var(--sage);text-decoration:none;transition:color .15s;}
.fg-forgot:hover{color:var(--sage-d);text-decoration:underline;}

.fg-cta{position:relative;overflow:hidden;width:100%;height:52px;margin-top:8px;border:none;border-radius:999px;cursor:pointer;
 font-family:var(--font-grotesk);font-weight:600;font-size:15px;letter-spacing:.01em;color:#fff;
 background:linear-gradient(135deg,var(--teal) 0%,var(--sage) 70%);
 box-shadow:0 12px 26px -10px rgba(80,145,127,.6);
 transition:transform .16s,box-shadow .16s,filter .16s;display:inline-flex;align-items:center;justify-content:center;}
.fg-cta>span{position:relative;z-index:1;display:inline-flex;align-items:center;gap:9px;}
.fg-cta::after{content:"";position:absolute;inset:0;background:linear-gradient(110deg,transparent 34%,rgba(255,255,255,.32) 50%,transparent 66%);transform:translateX(-130%);transition:transform .7s ease;}
.fg-cta:hover:not(:disabled){transform:translateY(-1px);filter:brightness(1.03);box-shadow:0 16px 32px -10px rgba(80,145,127,.7);}
.fg-cta:hover:not(:disabled)::after{transform:translateX(130%);}
.fg-cta:active:not(:disabled){transform:translateY(0);}
.fg-cta:disabled{opacity:.6;cursor:not-allowed;}
.fg-spin{animation:fg-spin 1s linear infinite;display:inline-flex;}

.fg-alt{margin-top:22px;text-align:center;font-size:13.5px;color:var(--muted);}
.fg-alt a,.fg-linkbtn{color:var(--sage);font-weight:600;text-decoration:none;background:none;border:none;cursor:pointer;font-family:inherit;font-size:inherit;transition:color .15s;}
.fg-alt a:hover,.fg-linkbtn:hover{color:var(--sage-d);text-decoration:underline;}
.fg-error{display:flex;align-items:flex-start;gap:9px;padding:11px 13px;border-radius:12px;background:#fcecea;border:1px solid #f3cfca;color:#b4453a;font-size:13px;line-height:1.45;}
.fg-error svg{flex:none;margin-top:1px;color:#cf5246;}
.fg-back{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--muted);text-decoration:none;background:none;border:none;cursor:pointer;font-family:inherit;margin-bottom:20px;transition:color .15s;padding:0;align-self:flex-start;}
.fg-back:hover{color:var(--ink);}
.fg-iconbadge{width:54px;height:54px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:rgba(94,158,143,.12);border:1px solid rgba(94,158,143,.24);color:var(--sage);margin-bottom:18px;}
.fg-iconbadge.success{background:#e4f3ec;border-color:#bfe3d0;color:#3f9e74;}
.fg-resend{margin-top:2px;text-align:center;font-size:13px;color:var(--muted);}

.fg-footer{position:absolute;left:0;right:0;bottom:18px;z-index:2;text-align:center;font-size:12px;color:#86948f;}

@media(max-width:880px){
 .fg-card-inner{grid-template-columns:1fr;}
 .fg-brand{display:none;}
 .fg-badge{display:none;}
 .fg-formpanel{padding:42px 28px;}
 .fg-wordmark-m{display:block;}
 .fg-featrow{grid-template-columns:1fr;gap:4px;}
 .fg-feattile + .fg-feattile::before{display:none;}
 .fg-shell{padding:40px 18px 64px;}
 .fg-helix-wrap{right:-180px;opacity:.1;}
}
@media(max-width:420px){
 .fg-formpanel{padding:34px 22px;}
 .fg-title{font-size:26px;}
}
@media(prefers-reduced-motion:reduce){
 .fg-helix-flow,.fg-node,.fg-rise,.fg-cta::after{animation:none!important;opacity:1!important;transform:none!important;}
}
`;

import { Activity } from 'lucide-react';

export function Brand() {
  return <a className="brand" href="/" aria-label="Formwell home"><span className="brand-mark"><Activity size={23} strokeWidth={2.5} aria-hidden="true" /></span><span>formwell<span className="brand-dot">.</span></span></a>;
}
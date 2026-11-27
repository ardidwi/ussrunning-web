/** Fixed-width mask: keeps only the first character of local part and domain plus the top-level label. */
export function maskEmail(email: string): string {
    const at = email.lastIndexOf('@');
    if (at < 1 || at === email.length - 1) return '•••';
    const local = email.slice(0, at), domain = email.slice(at + 1), dot = domain.lastIndexOf('.');
    const tld = dot > 0 && dot < domain.length - 1 ? domain.slice(dot) : '';
    return `${local[0]}•••@${domain[0]}•••${tld}`;
}

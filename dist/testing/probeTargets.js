// True when two controls can be seen at the same time: neither hidden or scrolled out of its
// box, and both in the window or both past it (they come into it together).
export function seenTogether(b, one, other) {
    const boxes = [one, other].map((el) => (b.shown(el) ? b.seenBox(el) : null));
    if (boxes.some((box) => box === null || b.isEmpty(box)))
        return false;
    return b.inSight(one) === b.inSight(other);
}
// A dense list's link or button: 24 px high and wide, and 4 px (half a pixel of rounding) clear
// all round.
export function denseEnough(b, el, r) {
    if (!el.matches('a, button, [role=button]') || el.closest('.sk-dense-list') === null) {
        return false;
    }
    if (Math.min(r.width, r.height) < 23.5)
        return false;
    return b.controls().every((other) => {
        if (other === el || !seenTogether(b, el, other))
            return true;
        const o = b.seenBox(other);
        return (o.top - r.bottom >= 3.5 ||
            r.top - o.bottom >= 3.5 ||
            o.left - r.right >= 3.5 ||
            r.left - o.right >= 3.5);
    });
}
// A game can name the class without the stylesheet and get no error: the finding says which.
export function missingStyle(el) {
    const list = el.closest('.sk-dense-list');
    if (list === null || getComputedStyle(list).getPropertyValue('--sk-dense-list') !== '') {
        return '';
    }
    return ' (.sk-dense-list has no style here: load @seasonal/kit/components.css)';
}
export function smallTargets(b, least) {
    return b.controls().flatMap((el) => {
        const boxed = el.matches('input[type=checkbox], input[type=radio]');
        const target = (boxed ? el.closest('label') : null) ?? el;
        if (!b.shown(target) || b.inText(el))
            return [];
        const r = target.getBoundingClientRect();
        if (Math.min(r.width, r.height) >= least - 0.5 || denseEnough(b, target, r))
            return [];
        const size = `${String(Math.round(r.width))}x${String(Math.round(r.height))}`;
        return [b.marked(target, `${b.nameOf(target)} ${size}${missingStyle(target)}`)];
    });
}
// The rules as one object, in the order the page defines them.
export const TARGETS = { seenTogether, denseEnough, missingStyle, smallTargets };

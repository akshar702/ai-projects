import {
  trigger,
  transition,
  style,
  animate,
  query,
  group,
  stagger,
  state,
} from '@angular/animations';

/** Simple cross-fade route transition — no position:absolute layout issues */
export const routeAnimations = trigger('routeAnimation', [
  transition('* <=> *', [
    query(':enter', [style({ opacity: 0 })], { optional: true }),
    group([
      query(':leave', [
        animate('150ms ease-in', style({ opacity: 0 })),
      ], { optional: true }),
      query(':enter', [
        animate('250ms 100ms ease-out', style({ opacity: 1 })),
      ], { optional: true }),
    ]),
  ]),
]);

export const sidebarAnimation = trigger('sidebarWidth', [
  state('expanded', style({ width: '240px' })),
  state('collapsed', style({ width: '64px'  })),
  transition('expanded <=> collapsed', [
    animate('300ms cubic-bezier(0.4, 0, 0.2, 1)'),
  ]),
]);

export const labelFade = trigger('labelFade', [
  state('visible', style({ opacity: 1,  width: '*'  })),
  state('hidden',  style({ opacity: 0,  width: '0', overflow: 'hidden' })),
  transition('visible => hidden', animate('150ms ease-in')),
  transition('hidden => visible', animate('200ms 200ms ease-out')),
]);

/** User chat message — springs up from bottom */
export const userMessageAnim = trigger('userMessage', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(16px)' }),
    animate('300ms cubic-bezier(0.34,1.56,0.64,1)',
            style({ opacity: 1, transform: 'translateY(0)' })),
  ]),
]);

/** Agent chat message — fades in from left */
export const agentMessageAnim = trigger('agentMessage', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateX(-12px)' }),
    animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' })),
  ]),
]);

/**
 * LCP FIX — was 400ms with translateX(-24px).
 * Reduced to 250ms and removed translate to unblock first paint sooner.
 */
export const shellLoadAnim = trigger('shellLoad', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('250ms ease-out', style({ opacity: 1 })),
  ]),
]);

/**
 * LCP FIX — was '400ms 200ms ease-out'.
 * Removed 200ms delay — content should paint immediately after shell.
 */
export const contentLoadAnim = trigger('contentLoad', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('300ms ease-out', style({ opacity: 1 })),
  ]),
]);

export const logoAnim = trigger('logoAnim', [
  transition(':enter', [
    style({ opacity: 0, transform: 'scale(0.8)' }),
    animate('300ms 100ms ease-out', style({ opacity: 1, transform: 'scale(1)' })),
  ]),
]);

/**
 * LCP FIX — stagger reduced from 50ms to 20ms.
 * Focus Music is the 3rd nav item. At 50ms stagger it painted at ~350ms.
 * At 20ms stagger it paints at ~240ms — well within LCP budget.
 * Animation duration also reduced from 250ms to 200ms.
 */
export const navItemsAnim = trigger('navItems', [
  transition(':enter', [
    query('.nav-item', [
      style({ opacity: 0, transform: 'translateX(-12px)' }),
      stagger(20, [
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateX(0)' })),
      ]),
    ], { optional: true }),
  ]),
]);

/** Music card flip-in on load */
export const musicCardFlip = trigger('cardFlip', [
  transition(':enter', [
    style({ opacity: 0, transform: 'rotateY(-90deg)' }),
    animate('350ms ease-out', style({ opacity: 1, transform: 'rotateY(0)' })),
  ]),
]);

/** Floating music player slides up */
export const playerSlideUp = trigger('playerSlide', [
  transition(':enter', [
    style({ transform: 'translateY(100%)' }),
    animate('350ms cubic-bezier(0.34,1.56,0.64,1)',
            style({ transform: 'translateY(0)' })),
  ]),
  transition(':leave', [
    animate('250ms ease-in', style({ transform: 'translateY(100%)' })),
  ]),
]);

/** Thinking dots fade in/out */
export const thinkingAnim = trigger('thinkingFade', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('200ms ease-out', style({ opacity: 1 })),
  ]),
  transition(':leave', [
    animate('150ms ease-in', style({ opacity: 0 })),
  ]),
]);
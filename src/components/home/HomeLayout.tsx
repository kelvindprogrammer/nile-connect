import React from 'react';

/**
 * The shared three-column home shell used by the student, staff and employer
 * dashboards.
 *
 * Scroll behaviour (QA: "scrolling outside the sidebar causes the post feed to
 * scroll"): the whole page used to be one scroll container with the rails
 * merely `position: sticky`. A rail taller than the viewport therefore had its
 * lower half pinned permanently out of reach — the only way to move it was to
 * scroll the feed, which is exactly the "I have to scroll past the posts to
 * reach the cards" symptom.
 *
 * Each rail is now its own scroll port, capped to the visible height below the
 * 60px app header. A wheel gesture over a rail scrolls that rail through its
 * own content first, so every card in it is reachable directly; once the rail
 * bottoms out, scrolling chains to the page as normal. The feed column keeps
 * the page's natural scroll.
 *
 * Deliberately no `overscroll-behavior: contain` here: Chrome applies it to a
 * scroll container even when that container has nothing to scroll, so a rail
 * shorter than the viewport would swallow wheel events and freeze the page
 * entirely — a worse version of the bug this fixes.
 */

// top-4 sits just below the 60px header (which is outside this scroll port);
// the max height leaves the same 16px of breathing room at the bottom.
const RAIL_STICKY = 'sticky top-4 max-h-[calc(100vh-92px)] overflow-y-auto rail-scroll';

interface HomeLayoutProps {
    /** Desktop-only left rail (>= lg). */
    left?: React.ReactNode;
    /** Desktop-only right rail (>= xl). */
    right?: React.ReactNode;
    /** Rendered above the feed on small screens only — the mobile home needs
     *  more than a bare post list to be useful. */
    mobileHeader?: React.ReactNode;
    /** The centre column. */
    children: React.ReactNode;
}

const HomeLayout: React.FC<HomeLayoutProps> = ({ left, right, mobileHeader, children }) => (
    <div
        className={`max-w-[1180px] mx-auto p-4 md:py-6 grid grid-cols-1 gap-5 anime-fade-in font-sans pb-24 md:pb-6 items-start
            ${left ? 'lg:grid-cols-[260px_minmax(0,1fr)]' : ''}
            ${left && right ? 'xl:grid-cols-[260px_minmax(0,1fr)_300px]' : right ? 'xl:grid-cols-[minmax(0,1fr)_300px]' : ''}`}
    >
        {left && (
            <div className={`hidden lg:flex flex-col gap-5 ${RAIL_STICKY}`}>
                {left}
            </div>
        )}

        <div className="min-w-0">
            {mobileHeader && <div className="lg:hidden mb-4 space-y-4">{mobileHeader}</div>}
            {children}
        </div>

        {right && (
            <div className={`hidden xl:flex flex-col gap-5 ${RAIL_STICKY}`}>
                {right}
            </div>
        )}
    </div>
);

export default HomeLayout;

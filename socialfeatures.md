# MASTER ENGINEERING PROMPT

## Transform the Platform into a World-Class Social Ecosystem

You have **full engineering permissions** for this task.

This is not a request for a superficial UI upgrade or for adding a few social buttons. I want you to **deeply audit, redesign, engineer, integrate, test, and production-harden the entire social layer of the platform**.

The platform is expected to serve **15,000+ students**, so treat this as a serious production social network, not a prototype.

The objective is to build a social experience that is **inspired by the best ideas from WhatsApp, Instagram, Facebook, Snapchat, TikTok, Discord, Telegram, X, Reddit, BeReal, and modern community platforms — while creating our own superior experience specifically optimized for students.**

Do not merely copy competitors.

**Study the underlying interaction patterns and solve the problems better.**

---

# 1. CORE MANDATE

Perform a complete end-to-end audit of the existing platform before making changes.

Inspect:

* frontend architecture
* backend architecture
* database schema
* APIs
* authentication
* authorization/RBAC
* existing social functionality
* user profiles
* posts
* comments
* reactions
* feeds
* notifications
* media handling
* messaging
* groups
* search
* moderation
* reporting
* privacy
* blocking
* content permissions
* file/media storage
* real-time infrastructure
* caching
* pagination
* analytics
* mobile experience
* web experience
* performance
* accessibility
* security
* existing design system
* existing reusable components
* existing tests
* deployment architecture

Do not assume that existing functionality is correct.

**Trace features end-to-end from UI → API → business logic → database → real-time events → notifications → analytics.**

Identify architectural weaknesses before implementing new functionality.

---

# 2. PRODUCT VISION

The social layer should become a **complete student social ecosystem**.

A student should be able to:

* share what they are doing
* post thoughts
* share photos
* share videos
* create stories/statuses
* react to content
* comment
* repost
* quote-post
* share content privately
* mention friends
* follow/connect with people
* discover interesting people and content
* create groups
* create communities
* participate in discussions
* host live conversations
* participate in video calls
* communicate privately
* receive intelligent notifications
* control their privacy
* block/report users
* discover relevant communities
* manage their own digital identity

The experience should feel like a **real social platform**, not a school app that happens to have posts.

---

# 3. STORIES / STATUS SYSTEM

Build a sophisticated Stories/Status system inspired by the strongest parts of Instagram, Facebook and WhatsApp.

It should support:

### Story creation

Users should be able to create:

* text stories
* image stories
* video stories
* multiple-story sequences
* mentions
* hashtags
* stickers
* emojis
* polls
* questions
* reactions
* music/audio where legally and technically appropriate
* links where appropriate
* location/context tags where appropriate
* interactive elements

Create a polished story composer.

Support:

* camera/gallery selection
* cropping
* basic media editing
* text positioning
* drawing
* backgrounds
* previews
* draft handling
* upload progress
* retry on failure

### Story consumption

Implement:

* horizontal story tray
* unread/read states
* story progression
* tap navigation
* hold-to-pause
* swipe navigation
* automatic progression
* video controls
* story reply
* quick reactions
* story sharing where permitted
* mute story
* hide story
* report story

### Story privacy

Support configurable audiences such as:

* everyone/allowed platform audience
* connections/friends
* selected users
* custom audience
* close friends
* group/community audience

Users must have complete control over who can see their stories.

### Story analytics

For appropriate users, provide:

* views
* unique viewers
* reactions
* replies
* completion rate
* story-by-story performance

Do not expose inappropriate analytics to ordinary users.

---

# 4. GROUPS & COMMUNITIES

Build a serious Groups/Communities architecture inspired by WhatsApp Communities, Discord, Telegram groups and Facebook Groups.

Do not make groups merely another post feed.

Groups should support:

* creation
* naming
* descriptions
* avatars/covers
* member management
* invite links/codes
* join requests
* approval workflows
* admins
* moderators
* permissions
* announcements
* group posts
* discussions
* media
* files
* polls
* events
* pinned content
* group-specific notifications
* mentions
* search
* member directory
* moderation tools
* reporting
* muting
* leaving
* banning
* temporary restrictions

### Communities

Introduce a higher-level Community model where appropriate.

A community can contain:

* announcement spaces
* discussion groups
* subject groups
* clubs
* houses/classes
* interest groups
* project groups
* competition groups
* student organizations

Design the architecture so one community can contain multiple spaces without creating a technical mess.

---

# 5. ADVANCED POSTING SYSTEM

The existing posting experience must be significantly upgraded.

Support different post types:

* text
* image
* multiple images
* video
* link
* poll
* question
* announcement
* event
* achievement
* study-related post
* resource/file
* repost
* quote post

Implement:

### Reposting

Users should be able to:

* repost directly
* quote-post
* add commentary
* cancel/remove their repost

Clearly distinguish original content from reposted content.

Prevent duplicate/repeated content from destroying feed quality.

### Sharing

Support sharing to:

* friends
* groups
* communities
* private messages
* stories
* external sharing where appropriate

### Mentions

Implement:

`@username`

with:

* autocomplete
* notification
* permission controls
* abuse protection

### Hashtags

Implement:

`#topic`

with:

* discovery
* hashtag feeds
* trending topics where appropriate
* moderation controls

---

# 6. SOCIAL INTERACTIONS

Go beyond basic likes.

Consider:

* like
* love
* laugh
* celebrate
* insightful
* support
* custom reactions where appropriate
* comment
* reply
* threaded discussion
* mention
* bookmark/save
* repost
* quote
* share
* follow
* unfollow
* mute
* hide
* report

Interactions must feel instant.

Use optimistic UI carefully, with reliable rollback when server operations fail.

---

# 7. FEED ENGINE

Do not simply display posts chronologically.

Design a proper feed architecture.

Consider ranking signals such as:

* relationship strength
* recent interactions
* relevance
* freshness
* content quality
* community membership
* previous engagement
* diversity
* negative feedback
* muted content
* blocked users
* frequency limits

However:

**Do not create an addictive or manipulative recommendation system.**

Because the audience includes students, prioritize:

* relevance
* healthy engagement
* educational/community value
* meaningful interaction
* user control
* transparency

Prevent one user or topic from dominating the feed.

Implement:

* pagination/infinite scrolling
* pull-to-refresh
* skeleton loading
* empty states
* offline handling
* retry
* duplicate prevention
* ranking
* feed refresh
* "not interested"
* mute topic
* hide post

---

# 8. VIDEO & REAL-TIME COMMUNICATION

Build a high-quality video communication layer inspired by Snapchat and modern communication platforms.

Support where technically appropriate:

* one-to-one video calls
* group video calls
* voice calls
* call invitations
* incoming call UI
* ringing
* accept/reject
* mute
* camera toggle
* speaker/device switching
* participant management
* connection quality indicators
* reconnect handling
* call termination
* call history
* permission handling

For larger rooms, design a scalable architecture rather than trying to treat every call like a basic peer-to-peer connection.

Evaluate appropriate WebRTC/SFU infrastructure based on the existing stack.

Do not invent an infrastructure dependency without first examining the existing architecture.

---

# 9. REAL-TIME ARCHITECTURE

Social features must feel alive.

Design robust real-time events for:

* messages
* reactions
* comments
* mentions
* story interactions
* group activity
* notifications
* online presence where appropriate
* calls
* typing indicators
* read states
* live updates

Ensure real-time functionality gracefully degrades when connectivity is poor.

Nigeria-specific network conditions must be taken seriously.

Optimize for:

* unstable connections
* high latency
* mobile data constraints
* intermittent connectivity
* background/resumed sessions
* retries
* queued operations

---

# 10. NOTIFICATIONS

Create a sophisticated notification center.

Support:

* reactions
* comments
* replies
* mentions
* follows/connections
* reposts
* group activity
* community announcements
* story interactions
* invitations
* calls
* system notifications

Provide:

* read/unread
* grouping
* filtering
* notification preferences
* push notifications
* deep linking
* notification batching
* quiet periods where appropriate

Avoid notification spam.

---

# 11. USER PROFILES

Transform profiles into proper social identities.

Consider:

* avatar
* cover/banner
* bio
* interests
* school/class information where appropriate
* achievements
* communities
* posts
* media
* stories
* connections
* followers/following where appropriate
* mutual connections
* badges
* activity indicators

Privacy must determine what information is visible.

---

# 12. SOCIAL GRAPH

Build a proper social graph rather than scattered relationships.

Model:

* follows
* friendships/connections
* followers
* blocked users
* muted users
* close friends
* group membership
* community membership
* interactions

Ensure this architecture can scale to tens of thousands and eventually millions of users.

---

# 13. SEARCH & DISCOVERY

Build powerful social search.

Users should be able to discover:

* people
* posts
* hashtags
* groups
* communities
* topics
* media
* events

Implement:

* autocomplete
* ranking
* filters
* recent searches
* safe-search/moderation considerations
* typo tolerance where practical

---

# 14. EVENTS

Consider adding a social events layer.

Users/communities should be able to create:

* meetings
* club events
* competitions
* study sessions
* social events
* school events

Support:

* event details
* date/time
* location/virtual link
* attendees
* reminders
* discussions
* sharing

---

# 15. POLLS & INTERACTIVE CONTENT

Build excellent interactive posts.

Support:

* polls
* quizzes where appropriate
* questions
* voting
* anonymous voting where appropriate
* results
* expiration
* one-vote enforcement
* editing restrictions
* abuse prevention

---

# 16. BOOKMARKS / COLLECTIONS

Allow students to save useful social content.

Implement:

* save post
* save video
* save resource
* collections
* private saved content
* remove from collection
* search saved content

This is especially valuable for educational/community content.

---

# 17. CONTENT MODERATION & SAFETY

This is one of the highest-priority components.

We are serving a large student population.

Build robust:

* reporting
* blocking
* muting
* moderation queues
* admin review
* moderator roles
* content removal
* user restrictions
* spam detection
* abuse detection
* impersonation reporting
* inappropriate-content controls
* audit logs
* escalation workflows

Every report should have a traceable lifecycle.

Admins should be able to understand:

**who → did what → when → where → against whom → what action was taken.**

Never allow moderation actions to become invisible or unauditable.

---

# 18. PRIVACY

Implement privacy at the architectural level.

Users should control:

* profile visibility
* post audience
* story audience
* who can mention them
* who can message them
* who can add them to groups
* who can interact with them
* activity visibility
* online status where applicable

Privacy checks must happen server-side.

Never rely solely on frontend restrictions.

---

# 19. SECURITY

Treat every social feature as an attack surface.

Audit and protect against:

* IDOR
* unauthorized content access
* privilege escalation
* spam
* mass posting
* fake accounts
* bot abuse
* enumeration
* malicious uploads
* oversized media
* injection
* XSS
* CSRF where applicable
* rate-limit bypass
* notification abuse
* group-admin abuse
* privacy leaks
* insecure media URLs

Implement appropriate:

* authorization
* validation
* rate limits
* abuse controls
* signed media URLs where appropriate
* access checks
* audit logging
* secure upload processing

---

# 20. MEDIA INFRASTRUCTURE

Do not build social media without thinking seriously about media.

Audit and optimize:

* image processing
* thumbnails
* video transcoding
* compression
* adaptive playback
* storage
* CDN
* upload resumability
* upload cancellation
* failed uploads
* retries
* caching
* lazy loading
* prefetching

Optimize aggressively for mobile bandwidth.

---

# 21. PERFORMANCE

The platform must remain fast with thousands of users.

Establish performance budgets.

Audit:

* database queries
* indexes
* N+1 queries
* API response sizes
* feed generation
* media loading
* memory usage
* render performance
* network requests
* real-time connections
* caching

Do not accept:

* unnecessary spinners
* janky scrolling
* layout shifts
* duplicate requests
* excessive re-renders
* blocking UI
* slow navigation

The social experience should feel **instant**.

---

# 22. MOBILE UX

The mobile experience is especially important.

Design for:

* one-handed use
* thumb-friendly controls
* smooth gestures
* touch feedback
* keyboard behavior
* safe areas
* Android devices
* different screen sizes
* low-end devices
* poor networks
* background/foreground transitions

Do not simply shrink desktop UI onto mobile.

---

# 23. DESIGN QUALITY

The UI should feel comparable to a serious modern social application.

Study the best interaction patterns from:

* Instagram
* WhatsApp
* Snapchat
* Facebook
* TikTok
* Discord
* Telegram
* X
* Reddit
* BeReal

But do not blindly copy them.

Create a coherent design language for our platform.

Everything should feel intentional:

* animations
* transitions
* gestures
* loading states
* empty states
* errors
* confirmation states
* feedback
* typography
* spacing
* media presentation
* navigation

Avoid gimmicky animations that reduce performance.

---

# 24. UX EDGE CASES

Think beyond the happy path.

Every feature must account for:

* offline mode
* slow network
* upload failure
* duplicate taps
* expired sessions
* deleted content
* deleted users
* blocked users
* private accounts
* removed posts
* unavailable media
* revoked permissions
* group deletion
* user leaving group
* admin leaving
* last admin leaving
* simultaneous edits
* conflicting actions
* race conditions
* notification delivery failures

---

# 25. ADMIN SOCIAL CONTROL CENTER

Expand the admin platform to provide serious social operations.

Admins/moderators should be able to manage:

* users
* posts
* comments
* stories
* groups
* communities
* reports
* moderation queues
* banned users
* restricted users
* flagged media
* trends
* hashtags
* abuse signals
* appeals
* audit logs

Create dashboards for:

* active users
* daily active users
* posts
* comments
* reports
* moderation workload
* group growth
* community growth
* engagement
* retention
* failed uploads
* system health

---

# 26. ANALYTICS

Create an event-driven analytics architecture.

Track meaningful product events such as:

* post created
* post viewed
* post interacted with
* story created
* story viewed
* story completed
* group created
* group joined
* community joined
* call started
* call completed
* content shared
* report submitted
* content moderated

Avoid collecting unnecessary sensitive data.

Analytics must be privacy-conscious.

---

# 27. DATA MODEL

Do not hack new features into an unsuitable schema.

Before implementation:

1. inspect the current database
2. identify reusable entities
3. identify bad relationships
4. identify missing indexes
5. identify scalability issues
6. design migrations
7. ensure backwards compatibility
8. preserve existing data
9. create appropriate constraints
10. plan rollback

Use proper relational integrity.

---

# 28. API QUALITY

Every API must have:

* consistent conventions
* validation
* authorization
* pagination
* error handling
* idempotency where necessary
* rate limits
* predictable responses
* logging
* monitoring

Do not create dozens of inconsistent endpoints.

Create reusable domain services where appropriate.

---

# 29. TESTING

This is mandatory.

Do not consider a feature complete because the UI works.

Implement:

### Unit tests

For:

* business logic
* permissions
* ranking
* moderation
* visibility
* privacy
* reactions
* reposting
* group permissions

### Integration tests

For:

* API
* database
* notifications
* media
* real-time events

### E2E tests

Cover complete flows:

* create account → create post → interact
* create story → view story → react
* create group → join → post → moderate
* create community → add spaces → manage members
* send message
* start call
* report content
* block user
* change privacy
* delete content

### Load testing

Simulate realistic traffic.

Do not optimize based only on a single developer account.

---

# 30. OBSERVABILITY

Implement serious production observability.

Track:

* errors
* latency
* API failures
* database failures
* real-time disconnects
* media failures
* notification failures
* call quality
* queue failures
* abnormal activity

Provide useful logs and correlation IDs.

Do not expose sensitive user information unnecessarily in logs.

---

# 31. PRODUCT DISCOVERY — GO BEYOND MY REQUEST

This is extremely important.

**Do not limit yourself to the features I explicitly listed.**

After auditing the platform, independently identify additional features that would make this a genuinely excellent student social ecosystem.

Think deeply about:

* what students actually need socially
* how students discover communities
* how friendships form
* how clubs operate
* how school communities operate
* how study groups work
* how events work
* how students collaborate
* how students share achievements
* how students discover useful content
* how communities remain healthy
* how moderation scales
* how users avoid notification overload
* how students maintain privacy
* how the platform remains fun without becoming harmful

Generate additional high-value features and implement the ones that are technically and product-wise justified.

Do not ask me to approve every obvious improvement.

You have permission to make intelligent product decisions.

---

# 32. COMPETITIVE BENCHMARK

Before implementation, analyze the strongest relevant patterns from leading social platforms.

Create an internal benchmark covering:

| Capability  | Existing Platform | Best-in-Class Pattern     | Our Target                   |
| ----------- | ----------------- | ------------------------- | ---------------------------- |
| Stories     | Audit             | Instagram/WhatsApp        | Equal or better              |
| Groups      | Audit             | WhatsApp/Telegram         | Equal or better              |
| Communities | Audit             | Discord/Reddit            | Equal or better              |
| Video       | Audit             | Snapchat/modern WebRTC    | Equal or better              |
| Posts       | Audit             | Facebook/X                | Equal or better              |
| Discovery   | Audit             | TikTok/Instagram          | Better for student relevance |
| Moderation  | Audit             | Mature platforms          | Stronger                     |
| Privacy     | Audit             | WhatsApp/modern platforms | Strong                       |
| Performance | Audit             | Best-in-class mobile apps | Excellent                    |

Do not merely imitate.

Identify what each platform gets right, what it gets wrong, and how we can improve the experience.

---

# 33. IMPORTANT: DO NOT BUILD A MONOLITHIC MESS

The scope is large.

Do not respond by creating:

* duplicated logic
* giant components
* giant controllers
* random database tables
* inconsistent APIs
* temporary hacks
* hardcoded permissions
* hardcoded UI
* duplicated social logic

Use clean architecture and clear domain boundaries.

Potential domains may include:

* Social Graph
* Posts
* Stories
* Comments
* Reactions
* Sharing
* Groups
* Communities
* Messaging
* Calls
* Notifications
* Media
* Moderation
* Search
* Feed
* Analytics

Use the architecture that best fits the existing codebase rather than forcing a theoretical architecture onto it.

---

# 34. IMPLEMENTATION PROCESS

Follow this process.

## PHASE 1 — DISCOVERY

Thoroughly inspect the entire existing platform.

Do not modify code yet.

Produce an internal understanding of:

* architecture
* existing capabilities
* gaps
* dependencies
* technical debt
* scalability risks
* security risks
* UX problems

## PHASE 2 — SOCIAL PRODUCT AUDIT

Map every existing social capability.

Classify:

* excellent
* acceptable
* weak
* broken
* missing
* architecturally unsafe

## PHASE 3 — MASTER ARCHITECTURE

Design the complete social ecosystem.

Determine:

* data model
* API architecture
* event architecture
* real-time architecture
* media architecture
* permission architecture
* moderation architecture
* notification architecture
* feed architecture

## PHASE 4 — PRIORITIZATION

Create implementation waves.

Prioritize foundational infrastructure first.

Do not build a beautiful Stories UI on top of a broken media system.

## PHASE 5 — IMPLEMENTATION

Implement systematically.

Every feature must be production-ready.

## PHASE 6 — INTEGRATION

Ensure every new feature integrates with:

* notifications
* permissions
* search
* profiles
* analytics
* moderation
* admin
* feeds
* real-time infrastructure

## PHASE 7 — QA

Perform exhaustive testing.

## PHASE 8 — HARDENING

Fix:

* race conditions
* security vulnerabilities
* performance problems
* UX inconsistencies
* accessibility problems
* error states

## PHASE 9 — FINAL AUDIT

Act as:

* senior staff engineer
* principal product designer
* security engineer
* QA lead
* SRE
* product manager

and independently attempt to break everything.

---

# 35. QUALITY BAR

The following standard applies:

**"It works on my machine" is NOT acceptable.**

**"The UI looks good" is NOT acceptable.**

**"The endpoint returns 200" is NOT acceptable.**

A feature is complete only when it is:

* functional
* secure
* scalable
* tested
* accessible
* performant
* responsive
* observable
* maintainable
* integrated
* production-ready

---

# 36. ZERO REGRESSIONS

Existing platform functionality must remain operational.

Before changing anything:

* understand dependencies
* identify affected areas
* preserve backwards compatibility
* add regression tests
* run existing test suites

Do not break unrelated features.

If you discover existing bugs while working in a related area, fix them when safe and document them.

---

# 37. DO NOT STOP AT ANALYSIS

This is an **execution task**.

Do not simply give me:

* a list of ideas
* a product proposal
* screenshots
* a roadmap
* pseudocode
* a partial implementation

I want you to **inspect → architect → implement → test → fix → harden → verify**.

You have permission to make the necessary code, database, API, UI, infrastructure, and configuration changes.

If a missing dependency or infrastructure component is genuinely required, identify it precisely and integrate it using the architecture that best fits the existing system.

---

# 38. FINAL DELIVERABLE

At completion, provide a comprehensive engineering report containing:

### A. What you discovered

Major weaknesses in the existing social architecture.

### B. What you changed

Every major feature implemented.

### C. New capabilities

Features added beyond my original request.

### D. Architecture

How the social ecosystem now works.

### E. Database

Schema/migrations/indexes changed.

### F. APIs

Endpoints/services/events added or modified.

### G. Real-time

How real-time functionality works.

### H. Security

Security/privacy protections implemented.

### I. Moderation

How users and content are protected.

### J. Performance

What was optimized and measured.

### K. Testing

Exact tests performed and their results.

### L. Remaining risks

Anything that genuinely remains.

### M. Production readiness

Clearly state whether the social platform is ready for 15,000+ users and what evidence supports that conclusion.

---

# 39. FINAL MINDSET

Think like you are building the social layer of a company that expects millions of users eventually.

Do not think:

> "How do I add a Stories button?"

Think:

> "What architecture, UX, data model, real-time system, moderation system, privacy model, media pipeline, feed system, notification system, and operational infrastructure are required to make Stories genuinely world-class?"

Do the same for every feature.

**Think deeper than the request.**

**Find problems I did not mention.**

**Build solutions I did not think of.**

**Do not settle for average.**

The target is not merely to make our social features comparable to WhatsApp, Instagram, Snapchat, Facebook, TikTok, Discord, Telegram, or X.

The target is to create a **modern, scalable, safe, exceptionally polished student social ecosystem that combines the strongest ideas from all of them and improves upon them for our specific audience.**

Take ownership of the engineering quality.

Be extremely precise.

Be extremely thorough.

Be proactive.

Be creative.

Be critical of your own implementation.

And above all:

**BUILD IT PROPERLY.**

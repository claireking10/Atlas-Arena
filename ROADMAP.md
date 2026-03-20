# Atlas Arena Project Roadmap

This roadmap outlines the development phases for **Atlas Arena**, a map trivia web application.

```mermaid
gantt
    title Atlas Arena Development Timeline
    dateFormat  YYYY-MM-DD
    axisFormat  %m/%d
    tickInterval 1w

    section Initial Setup
    Requirements & User Roles (4h)       :done, setup1, 2026-02-13, 7d
    Confirm Quiz & Scoring               :active, after setup1, 2d

    section Sprint 1
    ER Diagrams (Users/Cities/QS) (4h)   :done, s1a, 2026-02-25, 7d
    Logic & Navigation Flow (4h)         :active, s1b, after s1a, 7d
    UI Design & Data Sourcing (6h)       :active, s1c, after s1b, 7d

    section Sprint 2
    Frontend Dev (Map/Account/Quiz) (10h):s2a, 2026-03-23, 8d
    JS Feature Implementation (6h)       :s2b, after s2a, 5d
    Database & Auth Integration (4h)     :s2c, after s2b, 3d

    section Sprint 3
    Testing & Optimization (4h)          :s3a, 2026-04-15, 5d
    Polish, Security & Sanitization (4h) :s3b, after s3a, 4d

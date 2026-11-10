# Submission answers
Team DEV404 · Dhanashree S. Hingnekar and Bhakti S. Kote

## Features completed
A signed-out visitor can start an isolated workspace, add project notes and inspect the exact sources behind an ownership claim. A second matching note updates the same claim and evidence label. Leads can review, approve and share a version. The incoming member can open it in a separate browser, complete a task and acknowledge receipt. Regenerating access invalidates the previous code and session.

## Technology details
The deployed React and Vite interface calls a same-origin Node API backed by PostgreSQL. The live workflow verified citation matching, deterministic evidence labels, persisted workspaces, signed incoming sessions and direct API denial for restricted and unpublished records.

## Changes since Round 1
We moved the handover workflow into one deployment with relational storage and explicit citation checks. We narrowed source ingestion to notes and used scoped access links to let judges exercise both roles without setup.

## What does not work yet
Company accounts, custom project setup, external repository import, email verification and email recovery are unavailable. Repository, chat and board examples are sample data. The optional hosted-model extraction path has not been independently verified on production.

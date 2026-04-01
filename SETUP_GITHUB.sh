#!/bin/bash
# ============================================
# AiXel Project - GitHub Setup & Branching
# ============================================
# Jalankan script ini di Terminal Mac:
#   cd ~/Desktop/GTI/AiXel\ Project
#   chmod +x SETUP_GITHUB.sh
#   ./SETUP_GITHUB.sh
# ============================================

echo "🚀 Memulai setup GitHub untuk AiXel Project..."

# Step 1: Init git repo
git init
git add .
git commit -m "Initial commit: Dashboard v1 + docs

- index.html: Dashboard dengan Firebase Realtime DB
- docs/: Program documents, onboarding kit, handbook, metrics tracker
- README.md: Project documentation"

# Step 2: Connect ke GitHub
git branch -M main
git remote add origin https://github.com/ichbalmunasdar/aixel-program.git
git push -u origin main

echo ""
echo "✅ Branch 'main' sudah di-push!"
echo ""

# Step 3: Buat semua feature branches
echo "📌 Membuat feature branches..."

# Branch Phase 1A: Landing Page
git checkout -b feature/phase1-landing
git push -u origin feature/phase1-landing

# Branch Phase 1B: Registration Form
git checkout -b feature/phase1-registration
git push -u origin feature/phase1-registration

# Branch Phase 1C: Admin Dashboard
git checkout -b feature/phase1-admin-dashboard
git push -u origin feature/phase1-admin-dashboard

# Branch Phase 2A: Participant Tracking
git checkout -b feature/phase2-participant-tracking
git push -u origin feature/phase2-participant-tracking

# Branch Phase 2B: Validation Workflow
git checkout -b feature/phase2-validation
git push -u origin feature/phase2-validation

# Branch Phase 3A: Reporting Dashboard
git checkout -b feature/phase3-reporting
git push -u origin feature/phase3-reporting

# Branch Phase 3B: Benefit System
git checkout -b feature/phase3-benefit
git push -u origin feature/phase3-benefit

# Kembali ke main
git checkout main

echo ""
echo "============================================"
echo "✅ SETUP SELESAI!"
echo "============================================"
echo ""
echo "Branch yang tersedia:"
echo "  main                              → Production (GitHub Pages)"
echo "  feature/phase1-landing            → Landing Page + FAQ + CTA"
echo "  feature/phase1-registration       → Form Pendaftaran Multi-step"
echo "  feature/phase1-admin-dashboard    → Admin Review Applicant"
echo "  feature/phase2-participant-tracking → Progress Tracking Matrix"
echo "  feature/phase2-validation         → Validation Workflow"
echo "  feature/phase3-reporting          → Reporting Dashboard + KPI"
echo "  feature/phase3-benefit            → Benefit Eligibility System"
echo ""
echo "🌐 Aktifkan GitHub Pages:"
echo "   Buka: https://github.com/ichbalmunasdar/aixel-program/settings/pages"
echo "   Source: Deploy from branch → main → / (root) → Save"
echo ""
echo "📖 Cara kerja dengan Claude:"
echo "   1. Minta Claude kerjakan 1 branch per sesi"
echo "   2. Contoh: 'Kerjakan feature/phase1-landing'"
echo "   3. Claude akan checkout branch, coding, commit, push"
echo "   4. Kalau limit, sesi berikutnya tinggal lanjut dari branch itu"
echo ""

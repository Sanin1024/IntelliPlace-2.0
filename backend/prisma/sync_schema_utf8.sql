-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('pending_scheduling', 'scheduled', 'in_progress', 'completed', 'overdue', 'rescheduled', 'absent', 'evaluation_pending');

-- CreateEnum
CREATE TYPE "DriveStatus" AS ENUM ('draft', 'published', 'active', 'closed', 'cancelled', 'withdrawn', 'archived');

-- CreateEnum
CREATE TYPE "RegistrationCloseReason" AS ENUM ('deadline', 'company_closed', 'capacity_full', 'cancelled', 'withdrawn', 'closed_manually');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('applied', 'shortlisted', 'selected', 'rejected', 'withdrawn');

-- CreateEnum
CREATE TYPE "DriveChangeType" AS ENUM ('schedule_change', 'venue_change', 'meeting_link_change', 'round_change', 'other');

-- CreateEnum
CREATE TYPE "DriveNotificationType" AS ENUM ('new_drive', 'deadline_reminder', 'schedule_change', 'cancellation', 'withdrawal', 'registration_closed', 'application_update');

-- CreateEnum
CREATE TYPE "DriveNotificationStatus" AS ENUM ('pending', 'sent', 'failed', 'suppressed');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('placement_drive', 'application', 'interview', 'deadline', 'eligibility', 'company_update', 'system_announcement');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('critical', 'high', 'normal', 'low');

-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('pending', 'sent', 'failed', 'read', 'suppressed');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('in_app', 'email', 'push');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('pending', 'processing', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "ProfileVerificationStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'REVISION_REQUIRED');

-- CreateEnum
CREATE TYPE "DatasetApprovalStatus" AS ENUM ('NOT_GENERATED', 'GENERATED', 'INCOMPLETE', 'UNDER_REVIEW', 'REVISION_REQUIRED', 'APPROVED', 'SHARED', 'REVOKED');

-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('pending', 'qualified', 'rejected', 'skipped');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('issued', 'pending', 'accepted', 'rejected', 'withdrawn', 'expired', 'revoked');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('internship', 'internship_ppo', 'full_time', 'part_time', 'contract', 'apprenticeship');

-- CreateEnum
CREATE TYPE "AcademicVerificationStatus" AS ENUM ('pending', 'verified', 'rejected', 'requires_correction');

-- CreateEnum
CREATE TYPE "SemesterResultStatus" AS ENUM ('published', 'pending', 'unavailable');

-- CreateEnum
CREATE TYPE "BacklogStatus" AS ENUM ('active', 'cleared');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "CorrectionRequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('ELIGIBLE', 'INELIGIBLE', 'PENDING_VERIFICATION', 'MANUAL_OVERRIDE');

-- CreateEnum
CREATE TYPE "ShortlistAction" AS ENUM ('shortlist', 'select', 'reject');

-- CreateEnum
CREATE TYPE "TrainingActivityStatus" AS ENUM ('scheduled', 'completed', 'pending', 'overdue', 'missed', 'cancelled', 'rescheduled');

-- CreateEnum
CREATE TYPE "ModuleLevel" AS ENUM ('beginner', 'intermediate', 'advanced');

-- CreateEnum
CREATE TYPE "ModuleProgressStatus" AS ENUM ('not_started', 'in_progress', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('updated', 'under_review', 'outdated');

-- CreateEnum
CREATE TYPE "ResourceVisibility" AS ENUM ('public', 'institution', 'training_group', 'restricted');

-- CreateEnum
CREATE TYPE "LinkStatus" AS ENUM ('ok', 'broken', 'unknown');

-- CreateEnum
CREATE TYPE "TestStatus" AS ENUM ('draft', 'published', 'in_progress', 'completed', 'archived');

-- CreateEnum
CREATE TYPE "TestGeneration" AS ENUM ('fixed', 'balanced');

-- CreateEnum
CREATE TYPE "ShowResultsMode" AS ENUM ('after_submit', 'after_deadline', 'manual');

-- CreateEnum
CREATE TYPE "AttemptEvaluationStatus" AS ENUM ('pending', 'evaluated', 'eval_failed');

-- CreateEnum
CREATE TYPE "ActivityEventType" AS ENUM ('tab_switch', 'focus_loss', 'window_blur', 'warning_shown', 'session_recovered', 'autosave_failed', 'submission_retry');

-- CreateEnum
CREATE TYPE "OutputNormalization" AS ENUM ('exact', 'trim_lines', 'trim_all');

-- CreateEnum
CREATE TYPE "TrainerRole" AS ENUM ('primary', 'assistant');

-- CreateEnum
CREATE TYPE "InterventionSeverity" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "InterventionStatus" AS ENUM ('open', 'monitoring', 'resolved');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('pending', 'acknowledged', 'completed');

-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('beginner', 'intermediate', 'advanced');

-- CreateEnum
CREATE TYPE "ConfidenceLevel" AS ENUM ('insufficient', 'low', 'moderate', 'high');

-- CreateEnum
CREATE TYPE "IntegrityFlagType" AS ENUM ('rapid_completion', 'suspicious_pattern', 'abnormal_improvement');

-- CreateEnum
CREATE TYPE "IntegrityFlagStatus" AS ENUM ('open', 'reviewed', 'dismissed');

-- CreateEnum
CREATE TYPE "RecommendationPriority" AS ENUM ('high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "ResumeParseStatus" AS ENUM ('pending', 'parsed', 'failed', 'needs_review');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('scheduled', 'confirmed', 'in_progress', 'completed', 'interrupted', 'failed', 'cancelled', 'rescheduled');

-- CreateEnum
CREATE TYPE "InterviewType" AS ENUM ('technical', 'hr', 'aptitude', 'group_discussion', 'managerial');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('placement_sharing', 'marketing_communications', 'data_processing');

-- CreateEnum
CREATE TYPE "DataRequestType" AS ENUM ('correction', 'deletion', 'data_export');

-- CreateEnum
CREATE TYPE "DataRequestStatus" AS ENUM ('pending', 'under_review', 'approved', 'rejected', 'completed');

-- CreateEnum
CREATE TYPE "RetentionAction" AS ENUM ('anonymize', 'delete');

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_created_by_fkey";

-- AlterTable
ALTER TABLE "aptitude_questions" ADD COLUMN     "correct_options" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "is_multi_select" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "branches" ADD COLUMN     "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "code" TEXT,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "coding_problems" ADD COLUMN     "output_normalization" "OutputNormalization" NOT NULL DEFAULT 'trim_lines',
ADD COLUMN     "partial_marks" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "time_limit_ms" INTEGER NOT NULL DEFAULT 5000;

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "contact_email" TEXT,
ADD COLUMN     "contact_phone" TEXT,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "hq_location" TEXT,
ADD COLUMN     "internal_notes" TEXT,
ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "mock_tests" ADD COLUMN     "generation_mode" "TestGeneration" NOT NULL DEFAULT 'fixed',
ADD COLUMN     "negative_marks" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "question_rules" JSONB,
ADD COLUMN     "results_published_at" TIMESTAMP(3),
ADD COLUMN     "security_config" JSONB,
ADD COLUMN     "show_results" "ShowResultsMode" NOT NULL DEFAULT 'after_submit',
ADD COLUMN     "shuffle_options" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shuffle_questions" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" "TestStatus" NOT NULL DEFAULT 'draft';

-- AlterTable
ALTER TABLE "notification_recipients" DROP CONSTRAINT "notification_recipients_pkey",
ADD COLUMN     "channel" "NotificationChannel" NOT NULL DEFAULT 'in_app',
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "delivery_status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'pending',
ADD COLUMN     "id" TEXT NOT NULL,
ADD COLUMN     "last_error" TEXT,
ADD COLUMN     "retry_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sent_at" TIMESTAMP(3),
ADD CONSTRAINT "notification_recipients_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "category" "NotificationCategory" NOT NULL DEFAULT 'system_announcement',
ADD COLUMN     "entity_id" TEXT,
ADD COLUMN     "entity_type" TEXT,
ADD COLUMN     "idempotency_key" TEXT,
ADD COLUMN     "priority" "NotificationPriority" NOT NULL DEFAULT 'normal',
ADD COLUMN     "schedule_id" TEXT,
ADD COLUMN     "scheduled_at" TIMESTAMP(3),
ALTER COLUMN "created_by" DROP NOT NULL;

-- AlterTable
ALTER TABLE "resources" ADD COLUMN     "alternatives" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "attribution" TEXT,
ADD COLUMN     "batch_id" INTEGER,
ADD COLUMN     "content_hash" TEXT,
ADD COLUMN     "content_status" "ContentStatus" NOT NULL DEFAULT 'updated',
ADD COLUMN     "difficulty" "ModuleLevel",
ADD COLUMN     "last_reviewed_at" TIMESTAMP(3),
ADD COLUMN     "license" TEXT,
ADD COLUMN     "previous_version_id" TEXT,
ADD COLUMN     "required_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "source_url" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "visibility" "ResourceVisibility" NOT NULL DEFAULT 'institution';

-- AlterTable
ALTER TABLE "student_answers" ADD COLUMN     "marks_awarded" DOUBLE PRECISION,
ADD COLUMN     "saved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "selected_options" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "student_profiles" ADD COLUMN     "academic_scheme" TEXT NOT NULL DEFAULT 'APJKTU_2019',
ADD COLUMN     "academic_status" "AcademicVerificationStatus" NOT NULL DEFAULT 'pending',
ADD COLUMN     "academic_updated_at" TIMESTAMP(3),
ADD COLUMN     "active_backlogs" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "admission_year" INTEGER,
ADD COLUMN     "alternate_phone" TEXT,
ADD COLUMN     "career_interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "cgpa_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "cleared_backlogs" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "college_email" TEXT,
ADD COLUMN     "college_name" TEXT DEFAULT 'LBS College of Engineering, Kasaragod',
ADD COLUMN     "completion_percentage" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "current_semester" INTEGER,
ADD COLUMN     "degree" TEXT DEFAULT 'B.Tech',
ADD COLUMN     "diploma_branch" TEXT,
ADD COLUMN     "diploma_institution" TEXT,
ADD COLUMN     "diploma_percentage" DOUBLE PRECISION,
ADD COLUMN     "diploma_year" INTEGER,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "dob" TIMESTAMP(3),
ADD COLUMN     "entry_type" TEXT NOT NULL DEFAULT 'REGULAR',
ADD COLUMN     "gap_duration_months" INTEGER,
ADD COLUMN     "gap_reason" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "github_url" TEXT,
ADD COLUMN     "graduating_batch" TEXT,
ADD COLUMN     "has_academic_gaps" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "has_diploma" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "historical_backlogs" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "internship_not_applicable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ktuid" TEXT,
ADD COLUMN     "linkedin_url" TEXT,
ADD COLUMN     "master_status" "ProfileVerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN     "notification_prefs" JSONB,
ADD COLUMN     "overall_percentage" DOUBLE PRECISION,
ADD COLUMN     "permanent_address" TEXT,
ADD COLUMN     "personal_email" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "photo_url" TEXT,
ADD COLUMN     "pincode" TEXT,
ADD COLUMN     "portfolio_url" TEXT,
ADD COLUMN     "preferred_domains" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "preferred_locations" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "preferred_roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "profile_updated_at" TIMESTAMP(3),
ADD COLUMN     "residential_address" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "submitted_at" TIMESTAMP(3),
ADD COLUMN     "tenth_board" TEXT,
ADD COLUMN     "tenth_percentage" DOUBLE PRECISION,
ADD COLUMN     "tenth_school" TEXT,
ADD COLUMN     "tenth_year" INTEGER,
ADD COLUMN     "twelfth_board" TEXT,
ADD COLUMN     "twelfth_percentage" DOUBLE PRECISION,
ADD COLUMN     "twelfth_school" TEXT,
ADD COLUMN     "twelfth_stream" TEXT,
ADD COLUMN     "twelfth_year" INTEGER,
ADD COLUMN     "university_affiliation" TEXT DEFAULT 'APJ Abdul Kalam Technological University',
ADD COLUMN     "university_id" TEXT,
ADD COLUMN     "verification_comments" TEXT,
ADD COLUMN     "verified_at" TIMESTAMP(3),
ADD COLUMN     "verified_by" TEXT,
ADD COLUMN     "willing_to_relocate" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "test_attempts" ADD COLUMN     "client_submitted_at" TIMESTAMP(3),
ADD COLUMN     "evaluation_status" "AttemptEvaluationStatus" NOT NULL DEFAULT 'pending',
ADD COLUMN     "extra_time_mins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_question_index" INTEGER,
ADD COLUMN     "option_orders" JSONB,
ADD COLUMN     "processed_at" TIMESTAMP(3),
ADD COLUMN     "question_order" JSONB,
ADD COLUMN     "submission_idempotency_key" TEXT,
ALTER COLUMN "score" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "total_marks" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "token_version" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "student_technical_skills" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "proficiency" TEXT NOT NULL DEFAULT 'intermediate',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_technical_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_projects" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "domain" TEXT,
    "technologies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "duration" TEXT,
    "is_team" BOOLEAN NOT NULL DEFAULT false,
    "contribution" TEXT,
    "project_url" TEXT,
    "github_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_internships" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'internship',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "duration_months" INTEGER,
    "responsibilities" TEXT,
    "technologies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "certificate_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_internships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_certifications" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "issue_date" TIMESTAMP(3) NOT NULL,
    "expiry_date" TIMESTAMP(3),
    "credential_id" TEXT,
    "verification_url" TEXT,
    "certificate_url" TEXT,
    "category" TEXT NOT NULL DEFAULT 'certification',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_documents" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_profile_verification_history" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "status" "ProfileVerificationStatus" NOT NULL,
    "officer_id" TEXT NOT NULL,
    "comments" TEXT,
    "sections" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_profile_verification_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "user_id" TEXT NOT NULL,
    "prefs" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "keys" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "assessment_slots" (
    "id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "instructions" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 50,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preliminary_assessments" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "slot_id" TEXT,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'pending_scheduling',
    "deadline" TIMESTAMP(3) NOT NULL,
    "test_attempt_id" TEXT,
    "score" INTEGER,
    "assignedLevel" "KnowledgeLevel",
    "completed_at" TIMESTAMP(3),
    "override_reason" TEXT,
    "overridden_by" TEXT,
    "overridden_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preliminary_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "placement_drives" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "job_role" TEXT NOT NULL,
    "job_description" TEXT,
    "responsibilities" TEXT,
    "required_skills" TEXT[],
    "qualifications" TEXT,
    "experience_required" TEXT,
    "employment_type" TEXT NOT NULL DEFAULT 'full_time',
    "location" TEXT,
    "vacancies" INTEGER,
    "ctc_min" DOUBLE PRECISION,
    "ctc_max" DOUBLE PRECISION,
    "monthly_salary" DOUBLE PRECISION,
    "stipend" DOUBLE PRECISION,
    "benefits" TEXT,
    "selection_process" TEXT,
    "min_cgpa" DOUBLE PRECISION,
    "max_backlogs" INTEGER,
    "registration_deadline" TIMESTAMP(3),
    "registration_closed_at" TIMESTAMP(3),
    "registration_close_reason" "RegistrationCloseReason",
    "status" "DriveStatus" NOT NULL DEFAULT 'draft',
    "rounds" JSONB,
    "duplicate_override_reason" TEXT,
    "conflict_override_reason" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by" TEXT,
    "cancellation_reason" TEXT,
    "withdrawn_at" TIMESTAMP(3),
    "withdrawn_by" TEXT,
    "withdrawal_reason" TEXT,
    "archived_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "placement_drives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_data_requirement_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company_name" TEXT,
    "description" TEXT,
    "fields" JSONB NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_data_requirement_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "placement_drive_data_requirements" (
    "id" TEXT NOT NULL,
    "drive_id" TEXT NOT NULL,
    "fields" JSONB NOT NULL,
    "instructions" TEXT,
    "template_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "placement_drive_data_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_placement_datasets" (
    "id" TEXT NOT NULL,
    "requirement_id" TEXT NOT NULL,
    "drive_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "DatasetApprovalStatus" NOT NULL DEFAULT 'GENERATED',
    "scope" TEXT NOT NULL DEFAULT 'applied_students',
    "total_students" INTEGER NOT NULL DEFAULT 0,
    "complete_count" INTEGER NOT NULL DEFAULT 0,
    "missing_count" INTEGER NOT NULL DEFAULT 0,
    "data" JSONB NOT NULL,
    "review_comments" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "shared_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generated_placement_datasets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dataset_export_history" (
    "id" TEXT NOT NULL,
    "dataset_id" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "exported_by" TEXT NOT NULL,
    "shared_with" TEXT,
    "exported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dataset_export_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_campaigns" (
    "id" TEXT NOT NULL,
    "drive_id" TEXT NOT NULL,

    CONSTRAINT "notification_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_schedules" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "reminder_type" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'pending',
    "processed_at" TIMESTAMP(3),
    "locked_at" TIMESTAMP(3),

    CONSTRAINT "notification_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drive_eligible_branches" (
    "drive_id" TEXT NOT NULL,
    "branch_id" INTEGER NOT NULL,

    CONSTRAINT "drive_eligible_branches_pkey" PRIMARY KEY ("drive_id","branch_id")
);

-- CreateTable
CREATE TABLE "drive_eligible_batches" (
    "drive_id" TEXT NOT NULL,
    "batch_id" INTEGER NOT NULL,

    CONSTRAINT "drive_eligible_batches_pkey" PRIMARY KEY ("drive_id","batch_id")
);

-- CreateTable
CREATE TABLE "drive_applications" (
    "id" TEXT NOT NULL,
    "drive_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'applied',
    "eligibility_override_reason" TEXT,
    "overridden_by" TEXT,
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawn_at" TIMESTAMP(3),
    "withdrawal_reason" TEXT,
    "resume_version_id" TEXT,
    "resume_label_at_submit" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drive_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drive_change_history" (
    "id" TEXT NOT NULL,
    "drive_id" TEXT NOT NULL,
    "changed_by" TEXT NOT NULL,
    "change_type" "DriveChangeType" NOT NULL,
    "previous_value" JSONB,
    "new_value" JSONB,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drive_change_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruitment_rounds" (
    "id" TEXT NOT NULL,
    "drive_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recruitment_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_round_progress" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "round_id" TEXT NOT NULL,
    "status" "RoundStatus" NOT NULL DEFAULT 'pending',
    "scheduled_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_round_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_activity_logs" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previous_status" TEXT,
    "new_status" TEXT,
    "actor_id" TEXT NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "drive_id" TEXT,
    "application_id" TEXT,
    "job_role" TEXT NOT NULL,
    "employment_type" "EmploymentType" NOT NULL,
    "offer_date" TIMESTAMP(3) NOT NULL,
    "joining_date" TIMESTAMP(3),
    "acceptance_deadline" TIMESTAMP(3),
    "ctc" DOUBLE PRECISION,
    "fixed_salary" DOUBLE PRECISION,
    "variable_pay" DOUBLE PRECISION,
    "monthly_salary" DOUBLE PRECISION,
    "stipend" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "offer_letter_url" TEXT,
    "offer_ref_number" TEXT,
    "source" TEXT NOT NULL DEFAULT 'on_campus',
    "status" "OfferStatus" NOT NULL DEFAULT 'issued',
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "rejection_reason" TEXT,
    "withdrawal_reason" TEXT,
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_history" (
    "id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previous_status" TEXT,
    "new_status" TEXT,
    "actor_id" TEXT NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drive_notifications" (
    "id" TEXT NOT NULL,
    "drive_id" TEXT NOT NULL,
    "type" "DriveNotificationType" NOT NULL,
    "status" "DriveNotificationStatus" NOT NULL DEFAULT 'pending',
    "dedup_key" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "recipient_count" INTEGER NOT NULL DEFAULT 0,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drive_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "semester_results" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "semester_number" INTEGER NOT NULL,
    "gpa" DOUBLE PRECISION,
    "sgpa" DOUBLE PRECISION,
    "credits_earned" INTEGER,
    "credits" DOUBLE PRECISION,
    "credits_attempted" INTEGER,
    "status" "SemesterResultStatus" NOT NULL DEFAULT 'pending',
    "verified_at" TIMESTAMP(3),
    "verified_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "semester_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backlog_records" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "subject_code" TEXT,
    "subject" TEXT,
    "subject_name" TEXT,
    "semester" INTEGER,
    "semester_number" INTEGER,
    "status" "BacklogStatus" NOT NULL DEFAULT 'active',
    "cleared_at" TIMESTAMP(3),
    "cleared_in_semester" INTEGER,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backlog_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_verification_history" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" "AcademicVerificationStatus" NOT NULL,
    "reason" TEXT,
    "performed_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academic_verification_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_transfers" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "from_branch_id" INTEGER NOT NULL,
    "to_branch_id" INTEGER NOT NULL,
    "from_batch_id" INTEGER NOT NULL,
    "to_batch_id" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'pending',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_correction_requests" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "field_requested" TEXT NOT NULL,
    "requested_value" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "document_url" TEXT,
    "status" "CorrectionRequestStatus" NOT NULL DEFAULT 'pending',
    "reviewed_by" TEXT,
    "rejection_reason" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_correction_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drive_eligibility_criteria" (
    "id" TEXT NOT NULL,
    "drive_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "criteria" JSONB NOT NULL,
    "change_reason" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "superseded_at" TIMESTAMP(3),

    CONSTRAINT "drive_eligibility_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eligibility_evaluations" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "drive_id" TEXT NOT NULL,
    "criteria_version" INTEGER NOT NULL,
    "status" "EvaluationStatus" NOT NULL,
    "criteria_results" JSONB NOT NULL,
    "override_reason" TEXT,
    "overridden_by" TEXT,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "evaluated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eligibility_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplementary_exams" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "semester_number" INTEGER NOT NULL,
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "result" TEXT NOT NULL,
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplementary_exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education_history" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "institution_name" TEXT,
    "start_year" INTEGER,
    "end_year" INTEGER,
    "gap_explanation" TEXT,
    "gap_doc_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_by" TEXT,

    CONSTRAINT "education_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shortlist_decisions" (
    "id" TEXT NOT NULL,
    "drive_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "action" "ShortlistAction" NOT NULL,
    "evaluation_id" TEXT,
    "conflict_override_reason" TEXT,
    "decided_by" TEXT NOT NULL,
    "decided_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shortlist_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_sessions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "topic_id" INTEGER,
    "module_id" TEXT,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "duration_mins" INTEGER NOT NULL DEFAULT 60,
    "learning_objectives" TEXT[],
    "location" TEXT,
    "meeting_link" TEXT,
    "created_by" TEXT NOT NULL,
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "start_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),

    CONSTRAINT "training_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_assignments" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "status" "TrainingActivityStatus" NOT NULL DEFAULT 'scheduled',
    "completed_at" TIMESTAMP(3),
    "last_reminded_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_versions" (
    "id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "description" TEXT,
    "archived_by" TEXT NOT NULL,
    "archived_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_link_checks" (
    "id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" "LinkStatus" NOT NULL DEFAULT 'unknown',
    "consecutive_failures" INTEGER NOT NULL DEFAULT 0,
    "last_checked_at" TIMESTAMP(3),
    "last_ok_at" TIMESTAMP(3),

    CONSTRAINT "resource_link_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_access_logs" (
    "id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_modules" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "level" "ModuleLevel" NOT NULL,
    "topic_id" INTEGER,
    "resource_id" TEXT,
    "assessment_test_id" TEXT,
    "coding_problem_id" TEXT,
    "min_passing_score" INTEGER NOT NULL DEFAULT 60,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "required_skills" TEXT[],
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_prerequisites" (
    "module_id" TEXT NOT NULL,
    "prerequisite_module_id" TEXT NOT NULL,

    CONSTRAINT "module_prerequisites_pkey" PRIMARY KEY ("module_id","prerequisite_module_id")
);

-- CreateTable
CREATE TABLE "module_progress" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "status" "ModuleProgressStatus" NOT NULL DEFAULT 'not_started',
    "prereq_exception_reason" TEXT,
    "prereq_exception_by" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "bestScore" INTEGER,
    "verified_by" TEXT,
    "completed_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_progress" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "position_seconds" INTEGER NOT NULL DEFAULT 0,
    "duration_seconds" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competency_records" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "level" "ModuleLevel" NOT NULL,
    "evidence" JSONB NOT NULL,
    "module_id" TEXT,
    "verified_by" TEXT NOT NULL,
    "verified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competency_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "declared_skills" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "declared_level" "SkillLevel" NOT NULL DEFAULT 'beginner',
    "verified_level" "SkillLevel",
    "confidence" "ConfidenceLevel" NOT NULL DEFAULT 'insufficient',
    "evidence_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "declared_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_evidence" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,
    "total_questions" INTEGER,
    "confidence" "ConfidenceLevel" NOT NULL DEFAULT 'insufficient',
    "test_attempt_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_integrity_flags" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "flag_type" "IntegrityFlagType" NOT NULL,
    "status" "IntegrityFlagStatus" NOT NULL DEFAULT 'open',
    "details" JSONB NOT NULL,
    "reviewed_by" TEXT,
    "review_note" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_integrity_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_recommendations" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "priority" "RecommendationPriority" NOT NULL DEFAULT 'medium',
    "reason" JSONB NOT NULL,
    "is_dismissed" BOOLEAN NOT NULL DEFAULT false,
    "dismissed_at" TIMESTAMP(3),
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "readiness_snapshots" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "overall" INTEGER,
    "label" TEXT NOT NULL,
    "confidence" "ConfidenceLevel" NOT NULL DEFAULT 'insufficient',
    "breakdown" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "readiness_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "career_goals" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "career_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_versions" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "change_reason" TEXT NOT NULL,
    "archived_by" TEXT NOT NULL,
    "archived_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempt_activity_logs" (
    "id" TEXT NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "event_type" "ActivityEventType" NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attempt_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_versions" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'General Resume',
    "original_name" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "parse_status" "ResumeParseStatus" NOT NULL DEFAULT 'pending',
    "parsed_data" JSONB,
    "privacy_scan" JSONB,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resume_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_access_tokens" (
    "id" TEXT NOT NULL,
    "resume_version_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resume_access_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_rubrics" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_rubrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_exams" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academic_exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviewer_availability" (
    "id" TEXT NOT NULL,
    "interviewer_id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interviewer_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mock_interviews" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "interviewer_id" TEXT NOT NULL,
    "type" "InterviewType" NOT NULL DEFAULT 'technical',
    "status" "InterviewStatus" NOT NULL DEFAULT 'scheduled',
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "meeting_link" TEXT,
    "rubric_id" TEXT,
    "application_id" TEXT,
    "cancellation_reason" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mock_interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_session_history" (
    "id" TEXT NOT NULL,
    "interview_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "actor_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_session_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_feedback" (
    "id" TEXT NOT NULL,
    "interview_id" TEXT,
    "scores" JSONB NOT NULL,
    "student_comments" TEXT NOT NULL,
    "confidential_notes" TEXT,
    "is_finalized" BOOLEAN NOT NULL DEFAULT false,
    "evaluated_by" TEXT NOT NULL,
    "evaluated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_reschedule_requests" (
    "id" TEXT NOT NULL,
    "interview_id" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "proposed_time" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_reschedule_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trainer_profiles" (
    "user_id" TEXT NOT NULL,
    "specialization" TEXT[],
    "expertise" TEXT[],
    "max_workload" INTEGER NOT NULL DEFAULT 20,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trainer_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "trainer_batch_assignments" (
    "id" TEXT NOT NULL,
    "trainer_id" TEXT NOT NULL,
    "batch_id" INTEGER NOT NULL,
    "role" "TrainerRole" NOT NULL DEFAULT 'primary',
    "assigned_by" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "trainer_batch_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_timetables" (
    "id" TEXT NOT NULL,
    "batch_id" INTEGER NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "subject" TEXT NOT NULL,

    CONSTRAINT "academic_timetables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trainer_session_assignments" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "trainer_id" TEXT NOT NULL,
    "role" "TrainerRole" NOT NULL DEFAULT 'primary',

    CONSTRAINT "trainer_session_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trainer_feedback" (
    "id" TEXT NOT NULL,
    "trainer_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "session_id" TEXT,
    "ratings" JSONB NOT NULL,
    "comments" TEXT,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trainer_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trainer_tasks" (
    "id" TEXT NOT NULL,
    "trainer_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "deadline" TIMESTAMP(3),
    "status" "TaskStatus" NOT NULL DEFAULT 'pending',
    "acknowledged_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trainer_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_interventions" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "trainer_id" TEXT NOT NULL,
    "severity" "InterventionSeverity" NOT NULL DEFAULT 'medium',
    "reason" TEXT NOT NULL,
    "action" TEXT,
    "status" "InterventionStatus" NOT NULL DEFAULT 'open',
    "follow_up_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_interventions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trainer_evaluations" (
    "id" TEXT NOT NULL,
    "trainer_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "metrics" JSONB NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trainer_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_setting_history" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT NOT NULL,
    "changed_by" TEXT NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_setting_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "type" "ConsentType" NOT NULL,
    "is_granted" BOOLEAN NOT NULL DEFAULT false,
    "policy_version" TEXT NOT NULL DEFAULT '1.0',
    "granted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_access_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "target_user_id" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "request_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_share_logs" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "drive_id" TEXT,
    "shared_by" TEXT NOT NULL,
    "dataTypes" TEXT[],
    "shared_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_share_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_requests" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "type" "DataRequestType" NOT NULL,
    "details" TEXT NOT NULL,
    "status" "DataRequestStatus" NOT NULL DEFAULT 'pending',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "resolution" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retention_policies" (
    "id" TEXT NOT NULL,
    "data_category" TEXT NOT NULL,
    "retention_days" INTEGER NOT NULL,
    "action" "RetentionAction" NOT NULL DEFAULT 'anonymize',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retention_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_technical_skills_student_id_idx" ON "student_technical_skills"("student_id");

-- CreateIndex
CREATE INDEX "student_projects_student_id_idx" ON "student_projects"("student_id");

-- CreateIndex
CREATE INDEX "student_internships_student_id_idx" ON "student_internships"("student_id");

-- CreateIndex
CREATE INDEX "student_certifications_student_id_idx" ON "student_certifications"("student_id");

-- CreateIndex
CREATE INDEX "student_documents_student_id_type_idx" ON "student_documents"("student_id", "type");

-- CreateIndex
CREATE INDEX "student_profile_verification_history_student_id_idx" ON "student_profile_verification_history"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "preliminary_assessments_student_id_key" ON "preliminary_assessments"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "preliminary_assessments_test_attempt_id_key" ON "preliminary_assessments"("test_attempt_id");

-- CreateIndex
CREATE INDEX "placement_drives_status_idx" ON "placement_drives"("status");

-- CreateIndex
CREATE INDEX "placement_drives_company_id_idx" ON "placement_drives"("company_id");

-- CreateIndex
CREATE INDEX "placement_drives_registration_deadline_idx" ON "placement_drives"("registration_deadline");

-- CreateIndex
CREATE UNIQUE INDEX "company_data_requirement_templates_name_key" ON "company_data_requirement_templates"("name");

-- CreateIndex
CREATE UNIQUE INDEX "placement_drive_data_requirements_drive_id_key" ON "placement_drive_data_requirements"("drive_id");

-- CreateIndex
CREATE INDEX "generated_placement_datasets_drive_id_version_idx" ON "generated_placement_datasets"("drive_id", "version");

-- CreateIndex
CREATE INDEX "generated_placement_datasets_status_idx" ON "generated_placement_datasets"("status");

-- CreateIndex
CREATE UNIQUE INDEX "notification_campaigns_drive_id_key" ON "notification_campaigns"("drive_id");

-- CreateIndex
CREATE INDEX "notification_schedules_status_scheduled_at_idx" ON "notification_schedules"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "drive_applications_drive_id_idx" ON "drive_applications"("drive_id");

-- CreateIndex
CREATE INDEX "drive_applications_student_id_idx" ON "drive_applications"("student_id");

-- CreateIndex
CREATE INDEX "drive_applications_drive_id_status_idx" ON "drive_applications"("drive_id", "status");

-- CreateIndex
CREATE INDEX "drive_applications_student_id_status_idx" ON "drive_applications"("student_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "drive_applications_drive_id_student_id_key" ON "drive_applications"("drive_id", "student_id");

-- CreateIndex
CREATE INDEX "drive_change_history_drive_id_idx" ON "drive_change_history"("drive_id");

-- CreateIndex
CREATE INDEX "recruitment_rounds_drive_id_order_idx" ON "recruitment_rounds"("drive_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX "recruitment_rounds_drive_id_name_key" ON "recruitment_rounds"("drive_id", "name");

-- CreateIndex
CREATE INDEX "application_round_progress_application_id_idx" ON "application_round_progress"("application_id");

-- CreateIndex
CREATE INDEX "application_round_progress_round_id_idx" ON "application_round_progress"("round_id");

-- CreateIndex
CREATE INDEX "application_round_progress_application_id_status_idx" ON "application_round_progress"("application_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "application_round_progress_application_id_round_id_key" ON "application_round_progress"("application_id", "round_id");

-- CreateIndex
CREATE INDEX "application_activity_logs_application_id_idx" ON "application_activity_logs"("application_id");

-- CreateIndex
CREATE INDEX "offers_student_id_idx" ON "offers"("student_id");

-- CreateIndex
CREATE INDEX "offers_company_id_idx" ON "offers"("company_id");

-- CreateIndex
CREATE INDEX "offers_status_idx" ON "offers"("status");

-- CreateIndex
CREATE INDEX "offers_student_id_status_idx" ON "offers"("student_id", "status");

-- CreateIndex
CREATE INDEX "offers_company_id_status_idx" ON "offers"("company_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "offers_student_id_company_id_job_role_drive_id_key" ON "offers"("student_id", "company_id", "job_role", "drive_id");

-- CreateIndex
CREATE INDEX "offer_history_offer_id_idx" ON "offer_history"("offer_id");

-- CreateIndex
CREATE UNIQUE INDEX "drive_notifications_dedup_key_key" ON "drive_notifications"("dedup_key");

-- CreateIndex
CREATE INDEX "drive_notifications_drive_id_idx" ON "drive_notifications"("drive_id");

-- CreateIndex
CREATE INDEX "drive_notifications_status_idx" ON "drive_notifications"("status");

-- CreateIndex
CREATE INDEX "semester_results_student_id_idx" ON "semester_results"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "semester_results_student_id_semester_number_key" ON "semester_results"("student_id", "semester_number");

-- CreateIndex
CREATE INDEX "backlog_records_student_id_status_idx" ON "backlog_records"("student_id", "status");

-- CreateIndex
CREATE INDEX "academic_verification_history_student_id_idx" ON "academic_verification_history"("student_id");

-- CreateIndex
CREATE INDEX "student_transfers_student_id_idx" ON "student_transfers"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "profile_correction_requests_student_id_idx" ON "profile_correction_requests"("student_id");

-- CreateIndex
CREATE INDEX "drive_eligibility_criteria_drive_id_superseded_at_idx" ON "drive_eligibility_criteria"("drive_id", "superseded_at");

-- CreateIndex
CREATE UNIQUE INDEX "drive_eligibility_criteria_drive_id_version_key" ON "drive_eligibility_criteria"("drive_id", "version");

-- CreateIndex
CREATE INDEX "eligibility_evaluations_student_id_drive_id_is_current_idx" ON "eligibility_evaluations"("student_id", "drive_id", "is_current");

-- CreateIndex
CREATE INDEX "eligibility_evaluations_drive_id_is_current_idx" ON "eligibility_evaluations"("drive_id", "is_current");

-- CreateIndex
CREATE INDEX "supplementary_exams_student_id_idx" ON "supplementary_exams"("student_id");

-- CreateIndex
CREATE INDEX "education_history_student_id_idx" ON "education_history"("student_id");

-- CreateIndex
CREATE INDEX "shortlist_decisions_student_id_idx" ON "shortlist_decisions"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "shortlist_decisions_drive_id_student_id_key" ON "shortlist_decisions"("drive_id", "student_id");

-- CreateIndex
CREATE INDEX "training_sessions_scheduled_at_idx" ON "training_sessions"("scheduled_at");

-- CreateIndex
CREATE INDEX "training_assignments_student_id_status_idx" ON "training_assignments"("student_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "training_assignments_session_id_student_id_key" ON "training_assignments"("session_id", "student_id");

-- CreateIndex
CREATE INDEX "resource_versions_resource_id_idx" ON "resource_versions"("resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "resource_link_checks_resource_id_url_key" ON "resource_link_checks"("resource_id", "url");

-- CreateIndex
CREATE INDEX "resource_access_logs_resource_id_idx" ON "resource_access_logs"("resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "learning_modules_resource_id_key" ON "learning_modules"("resource_id");

-- CreateIndex
CREATE INDEX "module_progress_student_id_idx" ON "module_progress"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "module_progress_student_id_module_id_key" ON "module_progress"("student_id", "module_id");

-- CreateIndex
CREATE UNIQUE INDEX "video_progress_student_id_resource_id_key" ON "video_progress"("student_id", "resource_id");

-- CreateIndex
CREATE INDEX "competency_records_student_id_idx" ON "competency_records"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "competency_records_student_id_skill_key" ON "competency_records"("student_id", "skill");

-- CreateIndex
CREATE INDEX "declared_skills_student_id_idx" ON "declared_skills"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "declared_skills_student_id_skill_key" ON "declared_skills"("student_id", "skill");

-- CreateIndex
CREATE INDEX "skill_evidence_student_id_skill_idx" ON "skill_evidence"("student_id", "skill");

-- CreateIndex
CREATE INDEX "assessment_integrity_flags_student_id_idx" ON "assessment_integrity_flags"("student_id");

-- CreateIndex
CREATE INDEX "assessment_integrity_flags_status_idx" ON "assessment_integrity_flags"("status");

-- CreateIndex
CREATE INDEX "student_recommendations_student_id_is_dismissed_idx" ON "student_recommendations"("student_id", "is_dismissed");

-- CreateIndex
CREATE UNIQUE INDEX "student_recommendations_student_id_resource_id_key" ON "student_recommendations"("student_id", "resource_id");

-- CreateIndex
CREATE INDEX "readiness_snapshots_student_id_created_at_idx" ON "readiness_snapshots"("student_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "career_goals_student_id_key" ON "career_goals"("student_id");

-- CreateIndex
CREATE INDEX "question_versions_question_id_idx" ON "question_versions"("question_id");

-- CreateIndex
CREATE INDEX "attempt_activity_logs_attempt_id_idx" ON "attempt_activity_logs"("attempt_id");

-- CreateIndex
CREATE INDEX "attempt_activity_logs_student_id_idx" ON "attempt_activity_logs"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "resume_versions_storage_key_key" ON "resume_versions"("storage_key");

-- CreateIndex
CREATE INDEX "resume_versions_student_id_isActive_idx" ON "resume_versions"("student_id", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "resume_versions_student_id_version_key" ON "resume_versions"("student_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "resume_access_tokens_token_hash_key" ON "resume_access_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "resume_access_tokens_expires_at_idx" ON "resume_access_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "interview_rubrics_name_version_key" ON "interview_rubrics"("name", "version");

-- CreateIndex
CREATE INDEX "academic_exams_student_id_start_time_idx" ON "academic_exams"("student_id", "start_time");

-- CreateIndex
CREATE INDEX "interviewer_availability_interviewer_id_start_time_idx" ON "interviewer_availability"("interviewer_id", "start_time");

-- CreateIndex
CREATE INDEX "mock_interviews_student_id_status_idx" ON "mock_interviews"("student_id", "status");

-- CreateIndex
CREATE INDEX "mock_interviews_interviewer_id_status_idx" ON "mock_interviews"("interviewer_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "mock_interviews_student_id_start_time_type_key" ON "mock_interviews"("student_id", "start_time", "type");

-- CreateIndex
CREATE UNIQUE INDEX "mock_interviews_interviewer_id_start_time_key" ON "mock_interviews"("interviewer_id", "start_time");

-- CreateIndex
CREATE INDEX "interview_session_history_interview_id_idx" ON "interview_session_history"("interview_id");

-- CreateIndex
CREATE UNIQUE INDEX "interview_feedback_interview_id_key" ON "interview_feedback"("interview_id");

-- CreateIndex
CREATE INDEX "interview_feedback_interview_id_idx" ON "interview_feedback"("interview_id");

-- CreateIndex
CREATE INDEX "interview_reschedule_requests_status_idx" ON "interview_reschedule_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "trainer_batch_assignments_trainer_id_batch_id_key" ON "trainer_batch_assignments"("trainer_id", "batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "trainer_session_assignments_session_id_trainer_id_key" ON "trainer_session_assignments"("session_id", "trainer_id");

-- CreateIndex
CREATE UNIQUE INDEX "trainer_evaluations_trainer_id_period_key" ON "trainer_evaluations"("trainer_id", "period");

-- CreateIndex
CREATE INDEX "system_setting_history_key_idx" ON "system_setting_history"("key");

-- CreateIndex
CREATE UNIQUE INDEX "consent_records_student_id_type_key" ON "consent_records"("student_id", "type");

-- CreateIndex
CREATE INDEX "data_access_logs_target_user_id_idx" ON "data_access_logs"("target_user_id");

-- CreateIndex
CREATE INDEX "data_access_logs_actor_id_idx" ON "data_access_logs"("actor_id");

-- CreateIndex
CREATE INDEX "data_share_logs_student_id_idx" ON "data_share_logs"("student_id");

-- CreateIndex
CREATE INDEX "data_share_logs_company_id_idx" ON "data_share_logs"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "retention_policies_data_category_key" ON "retention_policies"("data_category");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "branches_code_key" ON "branches"("code");

-- CreateIndex
CREATE INDEX "notification_recipients_user_id_is_read_idx" ON "notification_recipients"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notification_recipients_delivery_status_channel_idx" ON "notification_recipients"("delivery_status", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "notification_recipients_notification_id_user_id_channel_key" ON "notification_recipients"("notification_id", "user_id", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_idempotency_key_key" ON "notifications"("idempotency_key");

-- CreateIndex
CREATE INDEX "notifications_category_idx" ON "notifications"("category");

-- CreateIndex
CREATE INDEX "notifications_priority_idx" ON "notifications"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_university_id_key" ON "student_profiles"("university_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_ktuid_key" ON "student_profiles"("ktuid");

-- CreateIndex
CREATE UNIQUE INDEX "test_attempts_submission_idempotency_key_key" ON "test_attempts"("submission_idempotency_key");

-- CreateIndex
CREATE INDEX "test_attempts_student_id_status_idx" ON "test_attempts"("student_id", "status");

-- CreateIndex
CREATE INDEX "test_attempts_test_id_status_idx" ON "test_attempts"("test_id", "status");

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_technical_skills" ADD CONSTRAINT "student_technical_skills_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_projects" ADD CONSTRAINT "student_projects_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_internships" ADD CONSTRAINT "student_internships_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_certifications" ADD CONSTRAINT "student_certifications_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_documents" ADD CONSTRAINT "student_documents_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profile_verification_history" ADD CONSTRAINT "student_profile_verification_history_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profile_verification_history" ADD CONSTRAINT "student_profile_verification_history_officer_id_fkey" FOREIGN KEY ("officer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "notification_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_slots" ADD CONSTRAINT "assessment_slots_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preliminary_assessments" ADD CONSTRAINT "preliminary_assessments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preliminary_assessments" ADD CONSTRAINT "preliminary_assessments_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "assessment_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preliminary_assessments" ADD CONSTRAINT "preliminary_assessments_test_attempt_id_fkey" FOREIGN KEY ("test_attempt_id") REFERENCES "test_attempts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placement_drives" ADD CONSTRAINT "placement_drives_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_data_requirement_templates" ADD CONSTRAINT "company_data_requirement_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placement_drive_data_requirements" ADD CONSTRAINT "placement_drive_data_requirements_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "placement_drives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_placement_datasets" ADD CONSTRAINT "generated_placement_datasets_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "placement_drive_data_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_placement_datasets" ADD CONSTRAINT "generated_placement_datasets_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "placement_drives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_placement_datasets" ADD CONSTRAINT "generated_placement_datasets_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_placement_datasets" ADD CONSTRAINT "generated_placement_datasets_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_export_history" ADD CONSTRAINT "dataset_export_history_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "generated_placement_datasets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_export_history" ADD CONSTRAINT "dataset_export_history_exported_by_fkey" FOREIGN KEY ("exported_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_campaigns" ADD CONSTRAINT "notification_campaigns_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "placement_drives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_schedules" ADD CONSTRAINT "notification_schedules_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "notification_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive_eligible_branches" ADD CONSTRAINT "drive_eligible_branches_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "placement_drives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive_eligible_branches" ADD CONSTRAINT "drive_eligible_branches_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive_eligible_batches" ADD CONSTRAINT "drive_eligible_batches_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "placement_drives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive_eligible_batches" ADD CONSTRAINT "drive_eligible_batches_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive_applications" ADD CONSTRAINT "drive_applications_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "placement_drives"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive_applications" ADD CONSTRAINT "drive_applications_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive_applications" ADD CONSTRAINT "drive_applications_resume_version_id_fkey" FOREIGN KEY ("resume_version_id") REFERENCES "resume_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive_change_history" ADD CONSTRAINT "drive_change_history_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "placement_drives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitment_rounds" ADD CONSTRAINT "recruitment_rounds_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "placement_drives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_round_progress" ADD CONSTRAINT "application_round_progress_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "drive_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_round_progress" ADD CONSTRAINT "application_round_progress_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "recruitment_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_activity_logs" ADD CONSTRAINT "application_activity_logs_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "drive_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "placement_drives"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "drive_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_history" ADD CONSTRAINT "offer_history_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive_notifications" ADD CONSTRAINT "drive_notifications_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "placement_drives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semester_results" ADD CONSTRAINT "semester_results_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backlog_records" ADD CONSTRAINT "backlog_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_verification_history" ADD CONSTRAINT "academic_verification_history_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_transfers" ADD CONSTRAINT "student_transfers_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_correction_requests" ADD CONSTRAINT "profile_correction_requests_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive_eligibility_criteria" ADD CONSTRAINT "drive_eligibility_criteria_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "placement_drives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eligibility_evaluations" ADD CONSTRAINT "eligibility_evaluations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eligibility_evaluations" ADD CONSTRAINT "eligibility_evaluations_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "placement_drives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplementary_exams" ADD CONSTRAINT "supplementary_exams_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_history" ADD CONSTRAINT "education_history_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlist_decisions" ADD CONSTRAINT "shortlist_decisions_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "placement_drives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlist_decisions" ADD CONSTRAINT "shortlist_decisions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlist_decisions" ADD CONSTRAINT "shortlist_decisions_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "eligibility_evaluations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "learning_modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_assignments" ADD CONSTRAINT "training_assignments_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "training_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_assignments" ADD CONSTRAINT "training_assignments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_versions" ADD CONSTRAINT "resource_versions_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_link_checks" ADD CONSTRAINT "resource_link_checks_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_access_logs" ADD CONSTRAINT "resource_access_logs_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_access_logs" ADD CONSTRAINT "resource_access_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_modules" ADD CONSTRAINT "learning_modules_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_modules" ADD CONSTRAINT "learning_modules_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_prerequisites" ADD CONSTRAINT "module_prerequisites_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "learning_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_prerequisites" ADD CONSTRAINT "module_prerequisites_prerequisite_module_id_fkey" FOREIGN KEY ("prerequisite_module_id") REFERENCES "learning_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_progress" ADD CONSTRAINT "module_progress_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_progress" ADD CONSTRAINT "module_progress_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "learning_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_progress" ADD CONSTRAINT "video_progress_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_progress" ADD CONSTRAINT "video_progress_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competency_records" ADD CONSTRAINT "competency_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "declared_skills" ADD CONSTRAINT "declared_skills_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_evidence" ADD CONSTRAINT "skill_evidence_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_evidence" ADD CONSTRAINT "skill_evidence_test_attempt_id_fkey" FOREIGN KEY ("test_attempt_id") REFERENCES "test_attempts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_integrity_flags" ADD CONSTRAINT "assessment_integrity_flags_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_integrity_flags" ADD CONSTRAINT "assessment_integrity_flags_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "test_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_recommendations" ADD CONSTRAINT "student_recommendations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_recommendations" ADD CONSTRAINT "student_recommendations_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "readiness_snapshots" ADD CONSTRAINT "readiness_snapshots_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "career_goals" ADD CONSTRAINT "career_goals_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_versions" ADD CONSTRAINT "question_versions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "aptitude_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_activity_logs" ADD CONSTRAINT "attempt_activity_logs_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "test_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_activity_logs" ADD CONSTRAINT "attempt_activity_logs_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_versions" ADD CONSTRAINT "resume_versions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_access_tokens" ADD CONSTRAINT "resume_access_tokens_resume_version_id_fkey" FOREIGN KEY ("resume_version_id") REFERENCES "resume_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_exams" ADD CONSTRAINT "academic_exams_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviewer_availability" ADD CONSTRAINT "interviewer_availability_interviewer_id_fkey" FOREIGN KEY ("interviewer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_interviews" ADD CONSTRAINT "mock_interviews_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_interviews" ADD CONSTRAINT "mock_interviews_interviewer_id_fkey" FOREIGN KEY ("interviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_interviews" ADD CONSTRAINT "mock_interviews_rubric_id_fkey" FOREIGN KEY ("rubric_id") REFERENCES "interview_rubrics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_interviews" ADD CONSTRAINT "mock_interviews_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "drive_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_session_history" ADD CONSTRAINT "interview_session_history_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "mock_interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_feedback" ADD CONSTRAINT "interview_feedback_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "mock_interviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_reschedule_requests" ADD CONSTRAINT "interview_reschedule_requests_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "mock_interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_profiles" ADD CONSTRAINT "trainer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_batch_assignments" ADD CONSTRAINT "trainer_batch_assignments_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_batch_assignments" ADD CONSTRAINT "trainer_batch_assignments_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_timetables" ADD CONSTRAINT "academic_timetables_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_session_assignments" ADD CONSTRAINT "trainer_session_assignments_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "training_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_session_assignments" ADD CONSTRAINT "trainer_session_assignments_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_feedback" ADD CONSTRAINT "trainer_feedback_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_feedback" ADD CONSTRAINT "trainer_feedback_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_feedback" ADD CONSTRAINT "trainer_feedback_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "training_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_tasks" ADD CONSTRAINT "trainer_tasks_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_interventions" ADD CONSTRAINT "student_interventions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_interventions" ADD CONSTRAINT "student_interventions_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_evaluations" ADD CONSTRAINT "trainer_evaluations_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_access_logs" ADD CONSTRAINT "data_access_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_access_logs" ADD CONSTRAINT "data_access_logs_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_share_logs" ADD CONSTRAINT "data_share_logs_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_share_logs" ADD CONSTRAINT "data_share_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_requests" ADD CONSTRAINT "data_requests_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


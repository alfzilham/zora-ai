-- ZORA AI - Database Schema
-- ==========================
-- PostgreSQL schema for ZORA AI platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,
    avatar_url VARCHAR(500),
    country VARCHAR(100) DEFAULT 'Unknown',
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for users table
CREATE INDEX IF NOT EXISTS idx_user_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_user_created_at ON users(created_at);

-- Comments for documentation
COMMENT ON TABLE users IS 'User accounts for ZORA AI authentication';
COMMENT ON COLUMN users.id IS 'Unique identifier (UUID)';
COMMENT ON COLUMN users.name IS 'User full name';
COMMENT ON COLUMN users.email IS 'Unique email address';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password (null for OAuth users)';
COMMENT ON COLUMN users.google_id IS 'Google OAuth ID (null for email users)';
COMMENT ON COLUMN users.avatar_url IS 'Profile picture URL';
COMMENT ON COLUMN users.country IS 'Detected user country or Unknown fallback';
COMMENT ON COLUMN users.is_active IS 'Account activation status';
COMMENT ON COLUMN users.created_at IS 'Account creation timestamp';
COMMENT ON COLUMN users.updated_at IS 'Last update timestamp';

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(255),
    topics JSONB NOT NULL DEFAULT '[]'::jsonb,
    language VARCHAR(10) NOT NULL DEFAULT 'id',
    onboarding_done BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding_done ON user_profiles(onboarding_done);

COMMENT ON TABLE user_profiles IS 'Onboarding profile and language preferences for each user';
COMMENT ON COLUMN user_profiles.user_id IS 'References the owning user account';
COMMENT ON COLUMN user_profiles.display_name IS 'Preferred display name collected during onboarding';
COMMENT ON COLUMN user_profiles.topics IS 'Selected onboarding topics stored as JSONB array';
COMMENT ON COLUMN user_profiles.language IS 'Preferred language code';
COMMENT ON COLUMN user_profiles.onboarding_done IS 'Marks whether onboarding flow has been completed';

-- Memory table
CREATE TABLE IF NOT EXISTS memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_memory_user_key ON memory(user_id, key);
CREATE INDEX IF NOT EXISTS idx_memory_updated_at ON memory(updated_at);

COMMENT ON TABLE memory IS 'Lightweight user memory key/value store for personalization';
COMMENT ON COLUMN memory.user_id IS 'References the owning user account';
COMMENT ON COLUMN memory.key IS 'Memory key name';
COMMENT ON COLUMN memory.value IS 'Memory value content';
COMMENT ON COLUMN memory.updated_at IS 'Timestamp of the most recent update';

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    is_incognito BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_created ON conversations(user_id, created_at);

COMMENT ON TABLE conversations IS 'Persisted chat conversations for each user';
COMMENT ON COLUMN conversations.title IS 'Auto-generated or user-visible conversation title';
COMMENT ON COLUMN conversations.is_incognito IS 'Whether the conversation was created in incognito mode';

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    model_used VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at);

COMMENT ON TABLE messages IS 'Stored chat messages within a conversation';
COMMENT ON COLUMN messages.role IS 'Message role: user or assistant';
COMMENT ON COLUMN messages.model_used IS 'Internal model route used to produce the assistant response';

-- Feedback table
CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    rating INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feedback_user_created ON feedback(user_id, created_at);

COMMENT ON TABLE feedback IS 'User-submitted feedback for ZORA AI';
COMMENT ON COLUMN feedback.message IS 'Freeform product feedback text';
COMMENT ON COLUMN feedback.rating IS 'Optional 1-5 satisfaction rating';

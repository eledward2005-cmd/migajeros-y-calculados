-- Esquema para SQL Server (2019 o superior / Azure SQL).
-- Ejecutar una vez con SSMS, Azure Data Studio o:
--   sqlcmd -S localhost -U sa -P "<clave>" -i database/schema.sqlserver.sql
-- También lo ejecuta automáticamente "npm run db:init" cuando DB_DRIVER=mssql.

IF DB_ID(N'MigajerosCalculados') IS NULL
  CREATE DATABASE MigajerosCalculados;
GO

USE MigajerosCalculados;
GO

IF OBJECT_ID(N'dbo.members', N'U') IS NULL
CREATE TABLE dbo.members (
  id            INT IDENTITY(1,1) PRIMARY KEY,
  first_name    NVARCHAR(100) NOT NULL,
  last_name     NVARCHAR(100) NOT NULL,
  email         NVARCHAR(255) NOT NULL CONSTRAINT UQ_members_email UNIQUE,
  password_hash NVARCHAR(255) NOT NULL,
  created_at    DATETIME2 NOT NULL CONSTRAINT DF_members_created DEFAULT SYSUTCDATETIME()
);
GO

IF OBJECT_ID(N'dbo.enrollments', N'U') IS NULL
CREATE TABLE dbo.enrollments (
  member_id    INT NOT NULL REFERENCES dbo.members(id) ON DELETE CASCADE,
  program_id   NVARCHAR(36) NOT NULL,
  joined_at    DATETIME2 NOT NULL CONSTRAINT DF_enrollments_joined DEFAULT SYSUTCDATETIME(),
  completed_at DATETIME2 NULL,
  CONSTRAINT PK_enrollments PRIMARY KEY (member_id, program_id)
);
GO

IF OBJECT_ID(N'dbo.step_progress', N'U') IS NULL
CREATE TABLE dbo.step_progress (
  member_id    INT NOT NULL REFERENCES dbo.members(id) ON DELETE CASCADE,
  program_id   NVARCHAR(36) NOT NULL,
  step_id      NVARCHAR(36) NOT NULL,
  completed_at DATETIME2 NOT NULL CONSTRAINT DF_step_progress_completed DEFAULT SYSUTCDATETIME(),
  CONSTRAINT PK_step_progress PRIMARY KEY (member_id, step_id)
);
GO

IF OBJECT_ID(N'dbo.member_badges', N'U') IS NULL
CREATE TABLE dbo.member_badges (
  member_id  INT NOT NULL REFERENCES dbo.members(id) ON DELETE CASCADE,
  badge_id   NVARCHAR(36) NOT NULL,
  program_id NVARCHAR(36) NOT NULL,
  awarded_at DATETIME2 NOT NULL CONSTRAINT DF_member_badges_awarded DEFAULT SYSUTCDATETIME(),
  CONSTRAINT PK_member_badges PRIMARY KEY (member_id, badge_id)
);
GO

IF OBJECT_ID(N'dbo.questions', N'U') IS NULL
CREATE TABLE dbo.questions (
  id         INT IDENTITY(1,1) PRIMARY KEY,
  first_name NVARCHAR(100) NOT NULL,
  last_name  NVARCHAR(100) NOT NULL,
  email      NVARCHAR(255) NOT NULL,
  subject    NVARCHAR(50)  NOT NULL,
  topic      NVARCHAR(200) NULL,
  question   NVARCHAR(MAX) NOT NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_questions_created DEFAULT SYSUTCDATETIME()
);
GO

IF OBJECT_ID(N'dbo.exercise_attempts', N'U') IS NULL
CREATE TABLE dbo.exercise_attempts (
  member_id   INT NOT NULL REFERENCES dbo.members(id) ON DELETE CASCADE,
  exercise_id NVARCHAR(40) NOT NULL,
  choice      NCHAR(1) NOT NULL,
  is_correct  BIT NOT NULL,
  answered_at DATETIME2 NOT NULL CONSTRAINT DF_exercise_attempts_answered DEFAULT SYSUTCDATETIME(),
  CONSTRAINT PK_exercise_attempts PRIMARY KEY (member_id, exercise_id)
);
GO

IF OBJECT_ID(N'dbo.member_settings', N'U') IS NULL
CREATE TABLE dbo.member_settings (
  member_id   INT NOT NULL PRIMARY KEY REFERENCES dbo.members(id) ON DELETE CASCADE,
  weekly_goal INT NOT NULL CONSTRAINT DF_member_settings_goal DEFAULT 5,
  focus_area  NVARCHAR(30) NULL
);
GO

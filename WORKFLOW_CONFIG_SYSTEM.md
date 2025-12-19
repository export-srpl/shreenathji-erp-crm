# Workflow Configuration System

## Overview

A centralized, admin-controlled workflow configuration module that allows authorized users to manage structural elements used across the CRM without code changes or redeployments.

## Features

### 1. Deal Pipelines
- **Multiple Pipelines**: Create and manage multiple deal pipelines
- **Custom Stages**: Define custom stage names with full control
- **Stage Ordering**: Drag-and-drop or manual ordering of stages
- **Stage Types**: Mark stages as `open`, `won`, or `lost`
- **Mandatory/Terminal Flags**: Control stage behavior
- **Default Pipeline**: Set one pipeline as the default
- **Color Coding**: Optional color coding for visual distinction
- **Usage Tracking**: See how many deals use each pipeline

### 2. Lead Stages
- **Custom Stage Names**: Full control over stage names
- **Sequential Ordering**: Define the order of stages
- **Stage Types**: `active`, `converted`, or `disqualified`
- **Color Coding**: Visual distinction with hex colors
- **Active/Inactive**: Enable or disable stages without deletion
- **Usage Tracking**: See how many leads are in each stage
- **Data Integrity**: Editing stages doesn't affect existing lead data

### 3. Lead Sources
- **Add/Edit/Deactivate**: Full CRUD operations
- **Description Support**: Add descriptions for clarity
- **Usage Tracking**: See how many leads use each source
- **Safe Deletion**: Prevent deletion of sources in use
- **Historical Preservation**: Deactivating doesn't affect historical data

### 4. Labels
- **Color-Coded Tags**: Create labels with hex color codes
- **Universal Application**: Can be applied to leads, deals, customers, etc.
- **Segmentation**: Use for filtering and quick identification
- **Active/Inactive**: Enable or disable without deletion

## Security & Permissions

- **Admin Only**: All configuration changes require admin role
- **Read Access**: All authenticated users can view configurations
- **Validation**: Server-side validation prevents invalid configurations
- **Audit Trail**: All changes are timestamped

## Data Integrity & Safety

### Prevention of Data Loss
- **Usage Checks**: Cannot delete stages/sources in use
- **Mapping Before Deletion**: When renaming or deleting, users must map existing records to new values
- **Default Pipeline Protection**: Cannot delete the default pipeline
- **Backward Compatibility**: Historical records retain original values

### Safe Alternatives
- **Deactivation**: Instead of deletion, deactivate items
- **Mapping**: Map existing records to new stages/sources before deletion
- **Validation Errors**: Clear error messages when operations would cause data loss

## API Endpoints

### Deal Pipelines
- `GET /api/workflow-config/deal-pipelines` - List all pipelines
- `POST /api/workflow-config/deal-pipelines` - Create pipeline
- `GET /api/workflow-config/deal-pipelines/[id]` - Get pipeline
- `PATCH /api/workflow-config/deal-pipelines/[id]` - Update pipeline
- `DELETE /api/workflow-config/deal-pipelines/[id]` - Delete pipeline

### Lead Stages
- `GET /api/workflow-config/lead-stages` - List all stages
- `POST /api/workflow-config/lead-stages` - Create stage
- `GET /api/workflow-config/lead-stages/[id]` - Get stage
- `PATCH /api/workflow-config/lead-stages/[id]` - Update stage
- `DELETE /api/workflow-config/lead-stages/[id]` - Delete stage

### Lead Sources
- `GET /api/workflow-config/lead-sources` - List all sources
- `POST /api/workflow-config/lead-sources` - Create source
- `GET /api/workflow-config/lead-sources/[id]` - Get source
- `PATCH /api/workflow-config/lead-sources/[id]` - Update source
- `DELETE /api/workflow-config/lead-sources/[id]` - Delete source

### Labels
- `GET /api/workflow-config/labels` - List all labels
- `POST /api/workflow-config/labels` - Create label
- `GET /api/workflow-config/labels/[id]` - Get label
- `PATCH /api/workflow-config/labels/[id]` - Update label
- `DELETE /api/workflow-config/labels/[id]` - Delete label

## Database Schema

### DealPipeline
```prisma
model DealPipeline {
  id          String         @id @default(cuid())
  name        String
  description String?
  isDefault   Boolean        @default(false)
  isActive    Boolean        @default(true)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  stages      PipelineStage[]
  deals       Deal[]
}
```

### PipelineStage
```prisma
model PipelineStage {
  id          String        @id @default(cuid())
  pipelineId  String
  pipeline    DealPipeline  @relation(...)
  name        String
  order       Int           @default(0)
  stageType   String        @default("open") // 'open', 'won', 'lost'
  isMandatory Boolean       @default(false)
  isTerminal  Boolean       @default(false)
  color       String?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}
```

### LeadStage
```prisma
model LeadStage {
  id          String   @id @default(cuid())
  name        String   @unique
  order       Int      @default(0)
  stageType   String   @default("active") // 'active', 'converted', 'disqualified'
  color       String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### LeadSource
```prisma
model LeadSource {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Label
```prisma
model Label {
  id          String   @id @default(cuid())
  name        String   @unique
  color       String   // Hex color code (required)
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## UI Location

The workflow configuration interface is available at:
- **Path**: `/settings/workflow-config`
- **Access**: Admin role required for modifications
- **Features**: Tabbed interface for each configuration type

## Migration

### Step 1: Run Database Migration
```bash
npx prisma migrate dev --name add_workflow_config_system
```

This will:
- Create `DealPipeline`, `PipelineStage`, `LeadStage`, `LeadSource`, and `Label` tables
- Add `pipelineId` and `stageId` fields to `Deal` model
- Add `statusId` and `sourceId` fields to `Lead` model
- Create necessary indexes

### Step 2: Initialize Default Data (Optional)

You may want to create default pipelines, stages, and sources:

```typescript
// Example: Create default lead stages
const defaultStages = [
  { name: 'New', order: 0, stageType: 'active' },
  { name: 'Contacted', order: 1, stageType: 'active' },
  { name: 'Qualified', order: 2, stageType: 'active' },
  { name: 'Converted', order: 3, stageType: 'converted' },
  { name: 'Disqualified', order: 4, stageType: 'disqualified' },
];
```

## Integration Points

### Leads Module
- Lead form should use `LeadStage` options for status dropdown
- Lead form should use `LeadSource` options for source dropdown
- Lead listings should display stage colors and source names

### Deals Module
- Deal form should use `DealPipeline` and `PipelineStage` options
- Deal pipeline view should use configured stages
- Deal listings should show pipeline and stage information

### Filters & Reports
- All filters should use workflow configurations
- Reports should group by configured stages/sources
- Dashboards should reflect configured pipelines

## Future Enhancements

1. **Stage Transitions**: Define allowed transitions between stages
2. **Automation Rules**: Trigger actions based on stage changes
3. **Custom Fields**: Add custom fields to stages/sources
4. **Bulk Operations**: Bulk update records when configurations change
5. **Version History**: Track configuration changes over time
6. **Export/Import**: Export and import configurations

## Notes

- All changes are immediately reflected across the CRM
- No code changes or redeployments required for configuration updates
- Historical data is preserved even when configurations change
- The system is designed to be flexible and future-proof


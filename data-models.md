# Data Models

## Goal
```json
{
  "id": "unique-id",
  "title": "Goal title",
  "category": "play|stand-up-production|stand-up-writing|technical-professional|communication|chores",
  "description": "Detailed description",
  "priority": "high|medium|low",
  "dueDate": "2025-09-15",
  "status": "active|completed",
  "progress": 0.75,
  "subtasks": [
    {
      "id": "subtask-id",
      "title": "Subtask title",
      "completed": false,
      "dueDate": "2025-09-01",
      "notes": "Progress notes"
    }
  ],
  "notes": "General notes and updates",
  "createdAt": "2025-08-28T10:00:00Z",
  "completedAt": null
}
```

## Time Block
```json
{
  "id": "block-id",
  "goalId": "linked-goal-id",
  "title": "Work session title",
  "startTime": "2025-08-28T14:00:00Z",
  "endTime": "2025-08-28T16:00:00Z",
  "planned": true,
  "actualStartTime": "2025-08-28T14:05:00Z",
  "actualEndTime": "2025-08-28T15:45:00Z",
  "accomplishedNotes": "What was actually accomplished",
  "productivityRating": 8,
  "category": "play"
}
```

## Weekly Plan
```json
{
  "id": "week-id",
  "weekStart": "2025-08-26",
  "goals": [
    {
      "goalId": "goal-id",
      "plannedHours": 10,
      "actualHours": 8,
      "objectives": ["Specific objective 1", "Specific objective 2"]
    }
  ]
}
```

## Analytics
```json
{
  "userId": "user-id",
  "productivityPatterns": {
    "byTimeOfDay": {
      "morning": { "averageRating": 8.5, "totalBlocks": 25 },
      "afternoon": { "averageRating": 7.2, "totalBlocks": 30 }
    },
    "byCategory": {
      "technical-professional": { "averageRating": 8.0, "completionRate": 0.85 }
    }
  },
  "suggestions": [
    {
      "type": "time-optimization",
      "message": "You're most productive on technical tasks in the morning"
    }
  ]
}
```
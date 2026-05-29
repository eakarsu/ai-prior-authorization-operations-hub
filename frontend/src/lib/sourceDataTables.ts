export type SourceDataColumn = {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  unique: boolean;
  defaultValue: string;
  sourceLine: string;
};

export type SourceDataTable = {
  id: string;
  sourceProject: string;
  name: string;
  displayName: string;
  framework: string;
  sourceFile: string;
  columns: SourceDataColumn[];
};

export const sourceDataTables: SourceDataTable[] = [
  {
    "id": "ai-prior-authorization-operations-hub-auth-intake",
    "sourceProject": "Prior Authorization Operations",
    "name": "auth_intake",
    "displayName": "Authorization Intake",
    "framework": "AppSchema",
    "sourceFile": "generated/auth-intake.schema.ts",
    "columns": [
      {
        "name": "id",
        "type": "UUID",
        "nullable": false,
        "primaryKey": true,
        "unique": true,
        "defaultValue": "generated",
        "sourceLine": "id UUID PRIMARY KEY"
      },
      {
        "name": "name",
        "type": "TEXT",
        "nullable": false,
        "primaryKey": false,
        "unique": false,
        "defaultValue": "",
        "sourceLine": "name TEXT NOT NULL"
      },
      {
        "name": "status",
        "type": "TEXT",
        "nullable": false,
        "primaryKey": false,
        "unique": false,
        "defaultValue": "open",
        "sourceLine": "status TEXT NOT NULL"
      },
      {
        "name": "owner",
        "type": "TEXT",
        "nullable": true,
        "primaryKey": false,
        "unique": false,
        "defaultValue": "",
        "sourceLine": "owner TEXT"
      },
      {
        "name": "category",
        "type": "TEXT",
        "nullable": true,
        "primaryKey": false,
        "unique": false,
        "defaultValue": "Intake",
        "sourceLine": "category TEXT"
      },
      {
        "name": "updated_at",
        "type": "TIMESTAMP",
        "nullable": false,
        "primaryKey": false,
        "unique": false,
        "defaultValue": "now()",
        "sourceLine": "updated_at TIMESTAMP NOT NULL DEFAULT now()"
      }
    ]
  },
  {
    "id": "ai-prior-authorization-operations-hub-payer-rule-matching",
    "sourceProject": "Prior Authorization Operations",
    "name": "payer_rule_matching",
    "displayName": "Payer Rule Matching",
    "framework": "AppSchema",
    "sourceFile": "generated/payer-rule-matching.schema.ts",
    "columns": [
      {
        "name": "id",
        "type": "UUID",
        "nullable": false,
        "primaryKey": true,
        "unique": true,
        "defaultValue": "generated",
        "sourceLine": "id UUID PRIMARY KEY"
      },
      {
        "name": "name",
        "type": "TEXT",
        "nullable": false,
        "primaryKey": false,
        "unique": false,
        "defaultValue": "",
        "sourceLine": "name TEXT NOT NULL"
      },
      {
        "name": "status",
        "type": "TEXT",
        "nullable": false,
        "primaryKey": false,
        "unique": false,
        "defaultValue": "open",
        "sourceLine": "status TEXT NOT NULL"
      },
      {
        "name": "owner",
        "type": "TEXT",
        "nullable": true,
        "primaryKey": false,
        "unique": false,
        "defaultValue": "",
        "sourceLine": "owner TEXT"
      },
      {
        "name": "category",
        "type": "TEXT",
        "nullable": true,
        "primaryKey": false,
        "unique": false,
        "defaultValue": "Rules",
        "sourceLine": "category TEXT"
      },
      {
        "name": "updated_at",
        "type": "TIMESTAMP",
        "nullable": false,
        "primaryKey": false,
        "unique": false,
        "defaultValue": "now()",
        "sourceLine": "updated_at TIMESTAMP NOT NULL DEFAULT now()"
      }
    ]
  },
  {
    "id": "ai-prior-authorization-operations-hub-evidence-checklist",
    "sourceProject": "Prior Authorization Operations",
    "name": "evidence_checklist",
    "displayName": "Evidence Checklist",
    "framework": "AppSchema",
    "sourceFile": "generated/evidence-checklist.schema.ts",
    "columns": [
      {
        "name": "id",
        "type": "UUID",
        "nullable": false,
        "primaryKey": true,
        "unique": true,
        "defaultValue": "generated",
        "sourceLine": "id UUID PRIMARY KEY"
      },
      {
        "name": "name",
        "type": "TEXT",
        "nullable": false,
        "primaryKey": false,
        "unique": false,
        "defaultValue": "",
        "sourceLine": "name TEXT NOT NULL"
      },
      {
        "name": "status",
        "type": "TEXT",
        "nullable": false,
        "primaryKey": false,
        "unique": false,
        "defaultValue": "open",
        "sourceLine": "status TEXT NOT NULL"
      },
      {
        "name": "owner",
        "type": "TEXT",
        "nullable": true,
        "primaryKey": false,
        "unique": false,
        "defaultValue": "",
        "sourceLine": "owner TEXT"
      },
      {
        "name": "category",
        "type": "TEXT",
        "nullable": true,
        "primaryKey": false,
        "unique": false,
        "defaultValue": "Evidence",
        "sourceLine": "category TEXT"
      },
      {
        "name": "updated_at",
        "type": "TIMESTAMP",
        "nullable": false,
        "primaryKey": false,
        "unique": false,
        "defaultValue": "now()",
        "sourceLine": "updated_at TIMESTAMP NOT NULL DEFAULT now()"
      }
    ]
  },
  {
    "id": "ai-prior-authorization-operations-hub-packet-generation",
    "sourceProject": "Prior Authorization Operations",
    "name": "packet_generation",
    "displayName": "Packet Generation",
    "framework": "AppSchema",
    "sourceFile": "generated/packet-generation.schema.ts",
    "columns": [
      {
        "name": "id",
        "type": "UUID",
        "nullable": false,
        "primaryKey": true,
        "unique": true,
        "defaultValue": "generated",
        "sourceLine": "id UUID PRIMARY KEY"
      },
      {
        "name": "name",
        "type": "TEXT",
        "nullable": false,
        "primaryKey": false,
        "unique": false,
        "defaultValue": "",
        "sourceLine": "name TEXT NOT NULL"
      },
      {
        "name": "status",
        "type": "TEXT",
        "nullable": false,
        "primaryKey": false,
        "unique": false,
        "defaultValue": "open",
        "sourceLine": "status TEXT NOT NULL"
      },
      {
        "name": "owner",
        "type": "TEXT",
        "nullable": true,
        "primaryKey": false,
        "unique": false,
        "defaultValue": "",
        "sourceLine": "owner TEXT"
      },
      {
        "name": "category",
        "type": "TEXT",
        "nullable": true,
        "primaryKey": false,
        "unique": false,
        "defaultValue": "Submission",
        "sourceLine": "category TEXT"
      },
      {
        "name": "updated_at",
        "type": "TIMESTAMP",
        "nullable": false,
        "primaryKey": false,
        "unique": false,
        "defaultValue": "now()",
        "sourceLine": "updated_at TIMESTAMP NOT NULL DEFAULT now()"
      }
    ]
  },
  {
    "id": "ai-prior-authorization-operations-hub-denial-prevention",
    "sourceProject": "Prior Authorization Operations",
    "name": "denial_prevention",
    "displayName": "Denial Prevention",
    "framework": "AppSchema",
    "sourceFile": "generated/denial-prevention.schema.ts",
    "columns": [
      {
        "name": "id",
        "type": "UUID",
        "nullable": false,
        "primaryKey": true,
        "unique": true,
        "defaultValue": "generated",
        "sourceLine": "id UUID PRIMARY KEY"
      },
      {
        "name": "name",
        "type": "TEXT",
        "nullable": false,
        "primaryKey": false,
        "unique": false,
        "defaultValue": "",
        "sourceLine": "name TEXT NOT NULL"
      },
      {
        "name": "status",
        "type": "TEXT",
        "nullable": false,
        "primaryKey": false,
        "unique": false,
        "defaultValue": "open",
        "sourceLine": "status TEXT NOT NULL"
      },
      {
        "name": "owner",
        "type": "TEXT",
        "nullable": true,
        "primaryKey": false,
        "unique": false,
        "defaultValue": "",
        "sourceLine": "owner TEXT"
      },
      {
        "name": "category",
        "type": "TEXT",
        "nullable": true,
        "primaryKey": false,
        "unique": false,
        "defaultValue": "Risk",
        "sourceLine": "category TEXT"
      },
      {
        "name": "updated_at",
        "type": "TIMESTAMP",
        "nullable": false,
        "primaryKey": false,
        "unique": false,
        "defaultValue": "now()",
        "sourceLine": "updated_at TIMESTAMP NOT NULL DEFAULT now()"
      }
    ]
  },
  {
    "id": "ai-prior-authorization-operations-hub-appeal-routing",
    "sourceProject": "Prior Authorization Operations",
    "name": "appeal_routing",
    "displayName": "Appeal Routing",
    "framework": "AppSchema",
    "sourceFile": "generated/appeal-routing.schema.ts",
    "columns": [
      {
        "name": "id",
        "type": "UUID",
        "nullable": false,
        "primaryKey": true,
        "unique": true,
        "defaultValue": "generated",
        "sourceLine": "id UUID PRIMARY KEY"
      },
      {
        "name": "name",
        "type": "TEXT",
        "nullable": false,
        "primaryKey": false,
        "unique": false,
        "defaultValue": "",
        "sourceLine": "name TEXT NOT NULL"
      },
      {
        "name": "status",
        "type": "TEXT",
        "nullable": false,
        "primaryKey": false,
        "unique": false,
        "defaultValue": "open",
        "sourceLine": "status TEXT NOT NULL"
      },
      {
        "name": "owner",
        "type": "TEXT",
        "nullable": true,
        "primaryKey": false,
        "unique": false,
        "defaultValue": "",
        "sourceLine": "owner TEXT"
      },
      {
        "name": "category",
        "type": "TEXT",
        "nullable": true,
        "primaryKey": false,
        "unique": false,
        "defaultValue": "Appeals",
        "sourceLine": "category TEXT"
      },
      {
        "name": "updated_at",
        "type": "TIMESTAMP",
        "nullable": false,
        "primaryKey": false,
        "unique": false,
        "defaultValue": "now()",
        "sourceLine": "updated_at TIMESTAMP NOT NULL DEFAULT now()"
      }
    ]
  },
  {
    "id": "ai-prior-authorization-operations-hub-peer-review-prep",
    "sourceProject": "Prior Authorization Operations",
    "name": "peer_review_prep",
    "displayName": "Peer Review Prep",
    "framework": "AppSchema",
    "sourceFile": "generated/peer-review-prep.schema.ts",
    "columns": [
      {
        "name": "id",
        "type": "UUID",
        "nullable": false,
        "primaryKey": true,
        "unique": true,
        "defaultValue": "generated",
        "sourceLine": "id UUID PRIMARY KEY"
      },
      {
        "name": "name",
        "type": "TEXT",
        "nullable": false,
        "primaryKey": false,
        "unique": false,
        "defaultValue": "",
        "sourceLine": "name TEXT NOT NULL"
      },
      {
        "name": "status",
        "type": "TEXT",
        "nullable": false,
        "primaryKey": false,
        "unique": false,
        "defaultValue": "open",
        "sourceLine": "status TEXT NOT NULL"
      },
      {
        "name": "owner",
        "type": "TEXT",
        "nullable": true,
        "primaryKey": false,
        "unique": false,
        "defaultValue": "",
        "sourceLine": "owner TEXT"
      },
      {
        "name": "category",
        "type": "TEXT",
        "nullable": true,
        "primaryKey": false,
        "unique": false,
        "defaultValue": "Clinical Review",
        "sourceLine": "category TEXT"
      },
      {
        "name": "updated_at",
        "type": "TIMESTAMP",
        "nullable": false,
        "primaryKey": false,
        "unique": false,
        "defaultValue": "now()",
        "sourceLine": "updated_at TIMESTAMP NOT NULL DEFAULT now()"
      }
    ]
  },
  {
    "id": "ai-prior-authorization-operations-hub-sla-tracking",
    "sourceProject": "Prior Authorization Operations",
    "name": "sla_tracking",
    "displayName": "SLA Tracking",
    "framework": "AppSchema",
    "sourceFile": "generated/sla-tracking.schema.ts",
    "columns": [
      {
        "name": "id",
        "type": "UUID",
        "nullable": false,
        "primaryKey": true,
        "unique": true,
        "defaultValue": "generated",
        "sourceLine": "id UUID PRIMARY KEY"
      },
      {
        "name": "name",
        "type": "TEXT",
        "nullable": false,
        "primaryKey": false,
        "unique": false,
        "defaultValue": "",
        "sourceLine": "name TEXT NOT NULL"
      },
      {
        "name": "status",
        "type": "TEXT",
        "nullable": false,
        "primaryKey": false,
        "unique": false,
        "defaultValue": "open",
        "sourceLine": "status TEXT NOT NULL"
      },
      {
        "name": "owner",
        "type": "TEXT",
        "nullable": true,
        "primaryKey": false,
        "unique": false,
        "defaultValue": "",
        "sourceLine": "owner TEXT"
      },
      {
        "name": "category",
        "type": "TEXT",
        "nullable": true,
        "primaryKey": false,
        "unique": false,
        "defaultValue": "Operations",
        "sourceLine": "category TEXT"
      },
      {
        "name": "updated_at",
        "type": "TIMESTAMP",
        "nullable": false,
        "primaryKey": false,
        "unique": false,
        "defaultValue": "now()",
        "sourceLine": "updated_at TIMESTAMP NOT NULL DEFAULT now()"
      }
    ]
  }
];

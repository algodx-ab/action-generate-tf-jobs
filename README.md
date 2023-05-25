# action-generate-tf-jobs

## Testing locally

```bash
$ cd ~/src/algodx-ab/infrastructure/
$ INPUT_CHANGED_DIRECTORIES="envs/global-infrastructure/dns" INPUT_SKIP_FILTERING_DIRECTORIES=".github modules" node ~/src/algodx-ab/action-generate-tf-jobs/index.js | sed 's/.*::{/{/' | jq

{
  "include": [
    {
      "environment": "global-infrastructure",
      "awsAccountId": 808981204034,
      "awsRegion": "us-east-1",
      "rootModuleGroupPath": "envs/global-infrastructure/",
      "rootModulePath": "envs/global-infrastructure/dns/",
      "rootModuleName": "dns",
      "backendConfigPath": "envs/environment/global-infrastructure/backend.conf",
      "installAwsCli": false,
      "azureadClientId": null,
      "azureadTenantId": null
    }
  ]
}
```

const core = require("@actions/core");
const glob = require("glob");
const fs = require("fs");
const yaml = require("js-yaml");
const path = require("path");

const parseCiFile = (ciFile) => {
    try {
        const doc = yaml.load(fs.readFileSync(ciFile, "utf8")) ?? {};
        doc.dirName = path.dirname(ciFile) + "/";
        return doc
    } catch (e) {
        throw e;
    }
};

const flattenEntries = (entries) => {
    const rootModuleGroups = entries.filter(entry => entry.kind === "RootModuleGroup");
    const rootModules = entries.filter(entry => entry.kind === "RootModule");
    rootModules.forEach((rootModule) => {
        rootModule.rootModuleGroups = []
        rootModuleGroups.forEach((rootModuleGroup) => {
            if (rootModule.dirName.startsWith(rootModuleGroup.dirName)) {
                rootModule.rootModuleGroups.push(rootModuleGroup)
            }
        });
    });
    const stacks = [];
    rootModules.forEach((rootModule) => {
        rootModule.rootModuleGroups.forEach((rootModuleGroup) => {
            const newRootModule = {...rootModule, ...rootModuleGroup.spec, ...rootModule.spec ?? {}};
            newRootModule.environments = newRootModule.environments || {}
            for (const [environmentName, props] of Object.entries(newRootModule.environments)) {
                const stack = {...newRootModule, ...props};
                stack.environment = environmentName
                stack.rootModuleGroupPath = rootModuleGroup.dirName;
                stack.rootModulePath = stack.dirName;
                stack.rootModuleName = path.basename(stack.dirName);
                const defaultBackendPath = `envs/environment/${stack.environment}/backend.conf`;
                stack.backendConfigPath = stack.backendConfigPath || defaultBackendPath;
                stack.installAwsCli = stack.installAwsCli || false;
                stack.azureadClientId = stack.azureadClientId || null;
                stack.azureadTenantId = stack.azureadTenantId || null;
                stacks.push(stack);
            };
        });
    });
    stacks.forEach((stack) => {
        delete stack.dirName;
        delete stack.kind;
        delete stack.spec;
        delete stack.rootModuleGroups;
        delete stack.environments;
    });
    return stacks;
};

const filterRootModules = (rootModules) => {
    var changedDirectories = core.getInput("changed_directories");
    changedDirectories = changedDirectories.split(" ");
    changedDirectories = changedDirectories.map(d => d + "/");

    // If certain directories are touched, run all jobs unconditionally
    const skipFilteringDirectories = core.getInput("skip_filtering_directories").split(" ").filter((e) => e !== "");
    for (const directory of changedDirectories) {
        for (var skipFilteringDirectory of skipFilteringDirectories) {
            skipFilteringDirectory += skipFilteringDirectory.endsWith("/") ? "" : "/";
            if (directory.startsWith(skipFilteringDirectory)) {
                return rootModules;
            }
        }
    };

    const filteredRootModules = [];
    rootModules.forEach((rootModule) => {
        for (const directory of changedDirectories) {
            if (directory.startsWith(rootModule.rootModulePath)) {
                filteredRootModules.push(rootModule);
                return;
            }
        }
    });

    return filteredRootModules;
};

const ciFiles = glob.globSync("envs/**/manifest.yaml", { ignore: ".terraform/**"})
ciFileEntries = ciFiles.map((ciFile) => parseCiFile(ciFile));

var rootModules = flattenEntries(ciFileEntries)

rootModules = filterRootModules(rootModules);

const includeStatement = rootModules.length === 0 ? {} : { include: rootModules };
core.setOutput("matrix", includeStatement);

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
    const newRootModules = [];
    const rootModuleGroups = entries.filter(entry => entry.kind === "RootModuleGroup");
    const rootModules = entries.filter(entry => entry.kind === "RootModule");
    rootModules.forEach((rootModule) => {
        rootModuleGroups.forEach((rootModuleGroup) => {
            var newRootModule = rootModule;
            if (rootModule.dirName.startsWith(rootModuleGroup.dirName)) {
                newRootModule = {...rootModuleGroup.spec, ...rootModule.spec ?? {}};
                newRootModule.rootModuleGroupPath = rootModuleGroup.dirName;
                newRootModule.rootModulePath = rootModule.dirName;
                newRootModule.rootModuleName = path.basename(rootModule.dirName);
                const defaultBackendPath = `envs/environment/${newRootModule.environment}/backend.conf`;
                newRootModule.backendConfigPath = newRootModule.backendConfigPath || defaultBackendPath;
                newRootModule.installAwsCli = newRootModule.installAwsCli || false;
            }
            delete newRootModule.kind;
            delete newRootModule.spec;
            newRootModules.push(newRootModule);
        });
    });
    return newRootModules;
};

const filterRootModules = (rootModules) => {
    var changedDirectories = core.getInput("changed_directories");
    changedDirectories = changedDirectories.split(" ");
    changedDirectories = changedDirectories.map(d => d + "/")

    // If certain directories are touched, run all jobs unconditionally
    for (const directory of changedDirectories) {
        if (directory.startsWith(".github/")) {
            return rootModules;
        }
        if (directory.startsWith("modules/")) {
            return rootModules;
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

const includeStatement = { include: rootModules };
core.setOutput("matrix", includeStatement);

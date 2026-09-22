using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

public static class BuildFirePrototype
{
    [MenuItem("Tools/Fire Training/Build Android Prototype")]
    public static void Build()
    {
        string scene = "Assets/Scenes/FireTraining.unity";
        if (!File.Exists(scene))
            throw new FileNotFoundException("Fire training scene is missing", scene);

        string directory = Path.Combine(Directory.GetParent(Application.dataPath).FullName,
            "Builds");
        Directory.CreateDirectory(directory);
        string apk = Path.Combine(directory, "FireTrainingPrototype.apk");

        EditorUserBuildSettings.buildAppBundle = false;
        BuildPlayerOptions options = new BuildPlayerOptions
        {
            scenes = new[] { scene },
            locationPathName = apk,
            target = BuildTarget.Android,
            options = BuildOptions.Development
        };
        BuildReport report = BuildPipeline.BuildPlayer(options);
        if (report.summary.result != BuildResult.Succeeded)
            throw new InvalidOperationException("Android build failed: " +
                report.summary.result + ". See the Unity Editor log for details.");
        Debug.Log("Fire prototype APK: " + apk);
    }
}

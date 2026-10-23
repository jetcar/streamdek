plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}

val releaseVersion = (System.getenv("RELEASE_VERSION") ?: "1.0.0").removePrefix("v")
val versionParts = releaseVersion.split('.').map { it.toIntOrNull() ?: 0 }

android {
    namespace = "cloud.passi.streamdek"
    compileSdk = 37

    defaultConfig {
        applicationId = "cloud.passi.streamdek"
        minSdk = 26
        targetSdk = 37
        versionCode = (versionParts.getOrElse(0) { 0 } * 10_000) +
            (versionParts.getOrElse(1) { 0 } * 100) + versionParts.getOrElse(2) { 0 }
        versionName = releaseVersion
    }

    buildFeatures {
        compose = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    val releaseKeystore = System.getenv("ANDROID_KEYSTORE_PATH")
    if (releaseKeystore != null) {
        signingConfigs {
            create("release") {
                storeFile = rootProject.file(releaseKeystore)
                storePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("ANDROID_KEY_ALIAS")
                keyPassword = System.getenv("ANDROID_KEY_PASSWORD")
            }
        }
        buildTypes.named("release") {
            signingConfig = signingConfigs.getByName("release")
        }
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2026.09.00")
    implementation(composeBom)
    androidTestImplementation(composeBom)

    implementation("androidx.activity:activity-compose:1.13.0")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.11.0")
    implementation("com.squareup.okhttp3:okhttp:5.5.1")
    debugImplementation("androidx.compose.ui:ui-tooling")

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20260814")
}

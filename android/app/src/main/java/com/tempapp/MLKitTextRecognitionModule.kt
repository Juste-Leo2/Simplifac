package com.tempapp

import android.net.Uri
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions

class MLKitTextRecognitionModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "MLKitTextRecognition"
    }

    @ReactMethod
    fun recognizeText(imageUri: String, promise: Promise) {
        try {
            val uri = Uri.parse(imageUri)
            val image = InputImage.fromFilePath(reactApplicationContext, uri)
            val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)

            recognizer.process(image)
                .addOnSuccessListener { visionText ->
                    promise.resolve(visionText.text)
                }
                .addOnFailureListener { e ->
                    promise.reject("OCR_ERROR", "Échec de l'analyse du texte", e)
                }
        } catch (e: Exception) {
            promise.reject("OCR_ERROR", "Image invalide ou introuvable", e)
        }
    }
}

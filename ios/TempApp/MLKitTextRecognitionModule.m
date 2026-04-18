#import "MLKitTextRecognitionModule.h"
#import <React/RCTLog.h>
#import <MLKitTextRecognition/MLKitTextRecognition.h>

@implementation MLKitTextRecognitionModule

RCT_EXPORT_MODULE(MLKitTextRecognition)

RCT_EXPORT_METHOD(recognizeText:(NSString *)imageUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    NSURL *url = [NSURL URLWithString:imageUri];
    if (!url || !url.scheme) {
        url = [NSURL fileURLWithPath:imageUri];
    }

    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        UIImage *uiImage = nil;
        if (url.isFileURL) {
            uiImage = [UIImage imageWithContentsOfFile:url.path];
        } else {
            NSError *error = nil;
            NSData *imageData = [NSData dataWithContentsOfURL:url options:0 error:&error];
            if (!imageData || error) {
                dispatch_async(dispatch_get_main_queue(), ^{
                    reject(@"FILE_ERROR", @"Cannot read file from URI", error);
                });
                return;
            }
            uiImage = [UIImage imageWithData:imageData];
        }

        if (!uiImage) {
            dispatch_async(dispatch_get_main_queue(), ^{
                reject(@"IMAGE_ERROR", @"Cannot parse image", nil);
            });
            return;
        }

        MLKVisionImage *visionImage = [[MLKVisionImage alloc] initWithImage:uiImage];
        visionImage.orientation = uiImage.imageOrientation;

        static MLKTextRecognizer *textRecognizer = nil;
        static dispatch_once_t onceToken;
        dispatch_once(&onceToken, ^{
            MLKTextRecognizerOptions *options = [[MLKTextRecognizerOptions alloc] init];
            textRecognizer = [MLKTextRecognizer textRecognizerWithOptions:options];
        });

        [textRecognizer processImage:visionImage
                          completion:^(MLKText * _Nullable result,
                                       NSError * _Nullable error) {
            if (error != nil || result == nil) {
                reject(@"OCR_ERROR", @"Traitement OCR iOS échoué", error);
                return;
            }
            resolve(result.text);
        }];
    });
}

@end

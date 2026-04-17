#import "MLKitTextRecognition.h"
#import <React/RCTLog.h>
#import <MLKitTextRecognition/MLKitTextRecognition.h>

@implementation MLKitTextRecognition

RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(recognizeText:(NSString *)imageUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    @try {
        NSURL *url = [NSURL URLWithString:imageUri];
        if (!url) {
            NSURL *fileUrl = [NSURL fileURLWithPath:imageUri];
            url = fileUrl;
        }

        NSData *imageData = [NSData dataWithContentsOfURL:url];
        if (!imageData) {
            reject(@"FILE_ERROR", @"Cannot read file from URI", nil);
            return;
        }

        UIImage *uiImage = [UIImage imageWithData:imageData];
        if (!uiImage) {
            reject(@"IMAGE_ERROR", @"Cannot parse image", nil);
            return;
        }

        MLKVisionImage *visionImage = [[MLKVisionImage alloc] initWithImage:uiImage];
        visionImage.orientation = uiImage.imageOrientation;

        MLKTextRecognizerOptions *options = [[MLKTextRecognizerOptions alloc] init];
        MLKTextRecognizer *textRecognizer = [MLKTextRecognizer textRecognizerWithOptions:options];

        [textRecognizer processImage:visionImage
                          completion:^(MLKText * _Nullable result,
                                       NSError * _Nullable error) {
            if (error != nil || result == nil) {
                reject(@"OCR_ERROR", @"Traitement OCR iOS échoué", error);
                return;
            }
            resolve(result.text);
        }];
    } @catch (NSException *exception) {
        reject(@"OCR_ERROR", exception.reason, nil);
    }
}

@end

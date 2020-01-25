#include <ApplicationServices/ApplicationServices.h>
#include <nan.h>

using namespace v8;

char* CFStringToUtf8String(CFStringRef str) {
    if (str == nullptr) {
        return nullptr;
    }
    CFIndex max = CFStringGetMaximumSizeForEncoding(CFStringGetLength(str), kCFStringEncodingUTF8) + 1;
    auto buffer = (char*)malloc(max);
    if (CFStringGetCString(str, buffer, max, kCFStringEncodingUTF8)) {
        return buffer;
    }
    free(buffer);
    return nullptr;
}

char* getStringAttribute(CTFontDescriptorRef ref, CFStringRef attr) {
    return CFStringToUtf8String((CFStringRef)CTFontDescriptorCopyAttribute(ref, attr));
}

char* getLocalizedAttribute(CTFontDescriptorRef ref, CFStringRef attr, CFStringRef *localized) {
    auto value = (CFStringRef)CTFontDescriptorCopyLocalizedAttribute(ref, attr, localized);
    if (value) {
        return CFStringToUtf8String(value);
    }
    return getStringAttribute(ref, attr);
}

int getFontWeight(CTFontDescriptorRef ref) {
    auto traits = (CFDictionaryRef)CTFontDescriptorCopyAttribute(ref, kCTFontTraitsAttribute);
    auto value = (CFNumberRef)CFDictionaryGetValue(traits, kCTFontWeightTrait);
    CFRelease(traits);
    float weight = 0.0f;
    if (CFNumberGetValue(value, kCFNumberFloat32Type, &weight)) {
        if (weight <= -0.8f) {
            return 100;
        } else if (weight <= -0.6f) {
            return 200;
        } else if (weight <= -0.4f) {
            return 300;
        } else if (weight <= 0.0f) {
            return 400;
        } else if (weight <= 0.25f) {
            return 500;
        } else if (weight <= 0.35f) {
            return 600;
        } else if (weight <= 0.4f) {
            return 700;
        } else if (weight <= 0.6f) {
            return 800;
        }
        return 900;
    }
    return 0;
}

char* getSrc(CTFontDescriptorRef ref) {
    auto url = (CFURLRef)CTFontDescriptorCopyAttribute(ref, kCTFontURLAttribute);
    return CFStringToUtf8String((CFStringRef)CFURLCopyPath(url));
}

unsigned int getSymbolic(CTFontDescriptorRef ref) {
    auto traits = (CFDictionaryRef)CTFontDescriptorCopyAttribute(ref, kCTFontTraitsAttribute);
    auto value = (CFNumberRef)CFDictionaryGetValue(traits, kCTFontSymbolicTrait);
    CFRelease(traits);
    unsigned int symbolic = 0;
    if (CFNumberGetValue(value, kCFNumberSInt32Type, &symbolic)) {
        return symbolic;
    }
    return 0;
}

Local<v8::Boolean> testTrait(unsigned int symbolic, unsigned int test) {
    return (symbolic & test) != 0 ? Nan::True() : Nan::False();
}

/*
Local<Array> getLanguages(CTFontDescriptorRef ref) {
    Nan::EscapableHandleScope scope;
    CFArrayRef results = (CFArrayRef)CTFontDescriptorCopyAttribute(ref, kCTFontLanguagesAttribute);
    if (results) {
        CFIndex i, count = CFArrayGetCount(results);
        Local<Array> res = Nan::New<Array>(count);
        for (i = 0; i < count; i++) {
            CFStringRef value = (CFStringRef)CFArrayGetValueAtIndex(results, i);
            res->Set(i, Nan::New<String>(CFStringToUtf8String(value)).ToLocalChecked());
        }
        CFRelease(results);
        return scope.Escape(res);
    }
    return scope.Escape(Nan::New<Array>(0));
}
*/

Local<Object> toJSObject(CTFontDescriptorRef ref) {
    Nan::EscapableHandleScope scope;
    Local<Object> res = Nan::New<Object>();
    CFStringRef localized = nullptr;
    res->Set(
        Nan::New<String>("font-family").ToLocalChecked(),
        Nan::New<String>(getLocalizedAttribute(ref, kCTFontFamilyNameAttribute, &localized)).ToLocalChecked()
    );
    res->Set(
        Nan::New<String>("font-style").ToLocalChecked(),
        Nan::New<String>(getStringAttribute(ref, kCTFontStyleNameAttribute)).ToLocalChecked()
    );
    res->Set(
        Nan::New<String>("font-weight").ToLocalChecked(),
        Nan::New<Number>(getFontWeight(ref))
    );
    res->Set(
        Nan::New<String>("src").ToLocalChecked(),
        Nan::New<String>(getSrc(ref)).ToLocalChecked()
    );
    res->Set(
        Nan::New<String>("postscriptName").ToLocalChecked(),
        Nan::New<String>(getStringAttribute(ref, kCTFontNameAttribute)).ToLocalChecked()
    );
    unsigned int symbolic = getSymbolic(ref);
    res->Set(
        Nan::New<String>("italic").ToLocalChecked(),
        testTrait(symbolic, kCTFontTraitItalic)
    );
    res->Set(
        Nan::New<String>("bold").ToLocalChecked(),
        testTrait(symbolic, kCTFontTraitBold)
    );
    res->Set(
        Nan::New<String>("monoSpace").ToLocalChecked(),
        testTrait(symbolic, kCTFontTraitMonoSpace)
    );
    /*
    res->Set(
        Nan::New<String>("language").ToLocalChecked(),
        getLanguages(ref)
    );
    */
    if (localized) {
        res->Set(
            Nan::New<String>("localized").ToLocalChecked(),
            Nan::New<String>(CFStringToUtf8String(localized)).ToLocalChecked()
        );
    }
    return scope.Escape(res);
}

NAN_METHOD(getAllLocalFonts) {
    CTFontCollectionRef collection = CTFontCollectionCreateFromAvailableFonts(nullptr);
    CFArrayRef results = CTFontCollectionCreateMatchingFontDescriptors(collection);
    CFRelease(collection);
    if (results) {
        CFIndex count = CFArrayGetCount(results);
        Local<Array> res = Nan::New<Array>(count);
        for (u_int32_t i = 0; i < count; i++) {
            res->Set(i, toJSObject((CTFontDescriptorRef)CFArrayGetValueAtIndex(results, i)));
        }
        CFRelease(results);
        info.GetReturnValue().Set(res);
    } else {
        info.GetReturnValue().Set(Nan::New<Array>(0));
    }
}
/*
NAN_METHOD(getBoundingRect) {
    if (info.Length() < 3 || !info[0]->IsString() || !info[1]->IsNumber() || !info[2]->IsString()) {
        return Nan::ThrowTypeError("Illegal Arguments");
    }
    Nan::Utf8String info0(info[0]);
    CFStringRef postscriptName = CFStringCreateWithCString(nullptr, *info0, kCFStringEncodingUTF8);
    double fontSize = info[1]->NumberValue();
    CTFontRef font = CTFontCreateWithName(postscriptName, fontSize, nullptr);
    Nan::Utf8String info2(info[2]);
    CFStringRef text = CFStringCreateWithCString(nullptr, *info2, kCFStringEncodingUTF8);
    int length = info2.length();

    UniChar characters[length];
    CFStringGetCharacters(text, { 0, length }, characters);
    CGGlyph glyphs[length];
    CTFontGetGlyphsForCharacters(font, characters, glyphs, length);
    CGRect rect = CTFontGetBoundingRectsForGlyphs(font, kCTFontDefaultOrientation, glyphs, nullptr, length);
    CFRelease(postscriptName);
    CFRelease(text);
    CFRelease(font);
    Local<Object> res = Nan::New<Object>();
    res->Set(
        Nan::New<String>("width").ToLocalChecked(),
        Nan::New<Number>(rect.size.width)
    );
    res->Set(
        Nan::New<String>("height").ToLocalChecked(),
        Nan::New<Number>(rect.size.height)
    );
    info.GetReturnValue().Set(res);
}
*/
NAN_MODULE_INIT(Init) {
    Nan::Export(target, "getAllLocalFonts", getAllLocalFonts);
    // Nan::Export(target, "getBoundingRect", getBoundingRect);
}

NODE_MODULE(fontFinder, Init)

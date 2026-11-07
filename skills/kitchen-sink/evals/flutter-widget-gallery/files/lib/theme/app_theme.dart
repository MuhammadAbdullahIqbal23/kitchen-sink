import 'package:flutter/material.dart';

class AppTheme {
  static const _seed = Color(0xFF2F6B3C);

  static final light = ThemeData(colorSchemeSeed: _seed);
  static final dark = ThemeData(colorSchemeSeed: _seed, brightness: Brightness.dark);
}

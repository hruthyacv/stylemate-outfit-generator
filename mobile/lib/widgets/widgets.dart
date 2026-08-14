import 'dart:ui';
import 'package:flutter/material.dart';

class LuxuryGlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final double? width;
  final double? height;
  final VoidCallback? onTap;

  const LuxuryGlassCard({
    Key? key, 
    required this.child, 
    this.padding = const EdgeInsets.all(20),
    this.width,
    this.height,
    this.onTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    Widget card = Container(
      width: width,
      height: height,
      padding: padding,
      decoration: BoxDecoration(
        color: const Color(0xFF141416).withOpacity(0.65),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.6),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: child,
    );

    if (onTap != null) {
      card = GestureDetector(
        onTap: onTap,
        child: card,
      );
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
        child: card,
      ),
    );
  }
}

class LuxuryButton extends StatelessWidget {
  final String text;
  final VoidCallback onPressed;
  final bool isPrimary;
  final bool isLoading;

  const LuxuryButton({
    Key? key,
    required this.text,
    required this.onPressed,
    this.isPrimary = true,
    this.isLoading = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: isLoading ? null : onPressed,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          gradient: isPrimary 
              ? const LinearGradient(colors: [Color(0xFFf0f0f0), Color(0xFFa0a0a0)])
              : null,
          color: isPrimary ? null : Colors.transparent,
          border: isPrimary ? null : Border.all(color: Colors.white.withOpacity(0.15)),
          borderRadius: BorderRadius.circular(6),
          boxShadow: isPrimary 
              ? [BoxShadow(color: Colors.white.withOpacity(0.1), blurRadius: 10)]
              : [],
        ),
        alignment: Alignment.center,
        child: isLoading 
            ? SizedBox(
                width: 20, height: 20, 
                child: CircularProgressIndicator(
                  strokeWidth: 2, 
                  color: isPrimary ? Colors.black : Colors.white
                )
              )
            : Text(
                text.toUpperCase(),
                style: TextStyle(
                  color: isPrimary ? Colors.black : Colors.white,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 1.5,
                  fontSize: 14,
                ),
              ),
      ),
    );
  }
}

class LuxuryTextField extends StatelessWidget {
  final String label;
  final TextEditingController controller;
  final bool obscureText;

  const LuxuryTextField({
    Key? key,
    required this.label,
    required this.controller,
    this.obscureText = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: const TextStyle(
            color: Colors.white54,
            fontSize: 10,
            letterSpacing: 1.5,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          obscureText: obscureText,
          style: const TextStyle(color: Colors.white, fontSize: 14),
          decoration: InputDecoration(
            filled: true,
            fillColor: Colors.white.withOpacity(0.05),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(6),
              borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(6),
              borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(6),
              borderSide: const BorderSide(color: Color(0xFFdcdcdc)),
            ),
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }
}

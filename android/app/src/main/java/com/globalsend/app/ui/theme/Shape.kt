package com.globalsend.app.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

val Shapes = Shapes(
    small = RoundedCornerShape(8.dp),
    medium = RoundedCornerShape(14.dp),
    large = RoundedCornerShape(20.dp),
    extraLarge = RoundedCornerShape(28.dp)
)

val CardShape = RoundedCornerShape(18.dp)
val PillShape = RoundedCornerShape(50.dp)
val ModalSheetShape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
